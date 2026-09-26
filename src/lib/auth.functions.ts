import { createServerFn } from "@tanstack/react-start";

import {
  assertLoginNotRateLimited,
  clearLoginAttempts,
  friendly,
  getSupportSession,
  hashPassword,
  readSession,
  recordFailedLogin,
  verifyPassword,
} from "./session.server";
import { logAudit } from "./audit.server";
import {
  db,
  ensureDefaultStaff,
  isValidTmsTransactionId,
  normalizeLoginNumber,
} from "./support.server";

const MIN_PASSWORD_LENGTH = 6;

// Thrown by studentLogin when the account exists but has no password set
// yet (e.g. a captain staff added by hand or CSV). The client matches this
// exact message to switch the UI over to the registration/setup form
// instead of just showing a generic "wrong credentials" toast.
export const NEEDS_SETUP_MESSAGE =
  "এই লগইন নম্বরে এখনো পাসওয়ার্ড সেট করা হয়নি। আগে রেজিস্ট্রেশন/সেটআপ সম্পন্ন করুন।";

export type CurrentUser =
  | { role: "guest" }
  | {
      role: "student";
      id: string;
      name: string;
      contact_number: string;
      login_number: string;
      student_code: string | null;
      email: string | null;
      account_role: "student" | "captain";
    }
  | { role: "staff"; id: string; username: string };

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentUser> => {
    const data = await readSession();
    if (data.role === "staff" && data.staffId) {
      return { role: "staff", id: data.staffId, username: data.username ?? "Support Team" };
    }
    if (data.role === "student" && data.studentId) {
      const { data: student } = await db
        .from("students")
        .select("id, name, contact_number, login_number, student_code, email, account_role, status")
        .eq("id", data.studentId)
        .maybeSingle();
      // A deactivated (or removed) account is treated as logged out, even if
      // the browser still holds a previously valid session cookie.
      if (student && student.status === "active") {
        return {
          role: "student",
          id: student.id,
          name: student.name,
          contact_number: student.contact_number,
          login_number: student.login_number,
          student_code: student.student_code,
          email: student.email,
          account_role: student.account_role === "captain" ? "captain" : "student",
        };
      }
    }
    return { role: "guest" };
  },
);

function normalizeTmsInput(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Creates a new student account, or "claims" an existing passwordless one
 * (a captain/student staff added by hand or CSV), by proving knowledge of
 * one of its TMS transaction ids, then sets a password on it.
 */
export const registerStudent = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      login_number: string;
      tms_transaction_id: string;
      name: string;
      email?: string;
      password: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const login_number = normalizeLoginNumber(data.login_number ?? "");
    const tms = normalizeTmsInput(data.tms_transaction_id ?? "");
    const name = (data.name ?? "").trim();
    const email = data.email?.trim() || null;
    const password = data.password ?? "";

    if (login_number.length < 6) throw friendly("সঠিক লগইন নম্বর দিন।");
    if (!isValidTmsTransactionId(tms)) {
      throw friendly("সঠিক ফরম্যাটে TMS ট্রানজেকশন আইডি দিন (যেমন TMS12345678)।");
    }
    if (name.length < 2) throw friendly("আপনার নাম লিখুন।");
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw friendly(`পাসওয়ার্ড কমপক্ষে ${MIN_PASSWORD_LENGTH} অক্ষরের হতে হবে।`);
    }

    const { data: existing } = await db
      .from("students")
      .select("id, name, email, status, tms_transaction_ids, password_hash")
      .eq("login_number", login_number)
      .maybeSingle();

    const password_hash = await hashPassword(password);

    if (!existing) {
      const { data: created, error } = await db
        .from("students")
        .insert({
          login_number,
          name,
          email,
          tms_transaction_ids: [tms],
          course_names: [],
          account_role: "student",
          status: "active",
          contact_number: login_number,
          password_hash,
        })
        .select("id, name, account_role")
        .single();

      // 23505 = unique_violation. Two concurrent registrations for the same
      // login_number can both pass the "not found" check above; the unique
      // index is the real guard, this just turns the race into a friendly
      // message instead of a raw DB error.
      if (error) {
        if (error.code === "23505") {
          throw friendly("এই লগইন নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে। লগইন করুন।");
        }
        throw friendly("রেজিস্ট্রেশন সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।");
      }

      const session = await getSupportSession();
      await session.update({ role: "student", studentId: created.id });
      await logAudit({
        actorType: "student",
        actorId: created.id,
        actorName: created.name,
        eventType: "student.registered",
        targetType: "student",
        targetId: created.id,
      });

      return {
        name: created.name,
        account_role: created.account_role === "captain" ? "captain" : "student",
      };
    }

    if (existing.password_hash) {
      throw friendly("এই লগইন নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে। লগইন করুন।");
    }
    if (existing.status !== "active") {
      throw friendly(
        "আপনার শিক্ষার্থী অ্যাকাউন্টটি নিষ্ক্রিয় আছে। সাপোর্ট টিমের সাথে যোগাযোগ করুন।",
      );
    }

    const existingTms = existing.tms_transaction_ids ?? [];
    if (existingTms.length > 0 && !existingTms.includes(tms)) {
      throw friendly("TMS ট্রানজেকশন আইডি মিলছে না। সঠিক তথ্য দিন অথবা সাপোর্টে যোগাযোগ করুন।");
    }

    const { data: updated, error: updateError } = await db
      .from("students")
      .update({
        password_hash,
        name: existing.name?.trim() ? existing.name : name,
        email: existing.email ?? email,
        tms_transaction_ids: existingTms.includes(tms) ? existingTms : [...existingTms, tms],
      })
      .eq("id", existing.id)
      .select("id, name, account_role")
      .single();

    if (updateError) throw friendly("রেজিস্ট্রেশন সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।");

    const session = await getSupportSession();
    await session.update({ role: "student", studentId: updated.id });
    await logAudit({
      actorType: "student",
      actorId: updated.id,
      actorName: updated.name,
      eventType: "student.registered",
      targetType: "student",
      targetId: updated.id,
      metadata: { claimed_existing: true },
    });

    return {
      name: updated.name,
      account_role: updated.account_role === "captain" ? "captain" : "student",
    };
  });

export const studentLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { login_number: string; password: string }) => input)
  .handler(async ({ data }) => {
    const login_number = normalizeLoginNumber(data.login_number ?? "");
    const password = data.password ?? "";

    if (login_number.length < 6) throw friendly("সঠিক লগইন নম্বর দিন।");
    if (!password) throw friendly("পাসওয়ার্ড দিন।");

    const rateLimitKey = `student:${login_number}`;
    assertLoginNotRateLimited(rateLimitKey);

    const deny = (): never => {
      recordFailedLogin(rateLimitKey);
      throw friendly("লগইন নম্বর অথবা পাসওয়ার্ড ভুল হয়েছে।");
    };

    const { data: student } = await db
      .from("students")
      .select("id, name, status, account_role, password_hash")
      .eq("login_number", login_number)
      .maybeSingle();

    if (!student) {
      recordFailedLogin(rateLimitKey);
      throw friendly("লগইন নম্বর অথবা পাসওয়ার্ড ভুল হয়েছে।");
    }
    if (student.status !== "active") {
      // Distinct message on purpose: this is an account-state issue, not a
      // credential guess, so it doesn't count against the rate limit.
      throw friendly(
        "আপনার শিক্ষার্থী অ্যাকাউন্টটি নিষ্ক্রিয় আছে। সাপোর্ট টিমের সাথে যোগাযোগ করুন।",
      );
    }
    if (!student.password_hash) {
      // Also not a credential guess -- doesn't count against the rate limit.
      throw friendly(NEEDS_SETUP_MESSAGE);
    }

    const ok = await verifyPassword(password, student.password_hash);
    if (!ok) deny();

    clearLoginAttempts(rateLimitKey);

    const session = await getSupportSession();
    await session.update({ role: "student", studentId: student.id });
    await db
      .from("students")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", student.id);

    await logAudit({
      actorType: "student",
      actorId: student.id,
      actorName: student.name,
      eventType: "student.login",
      targetType: "student",
      targetId: student.id,
      metadata: { account_role: student.account_role },
    });

    return {
      name: student.name,
      account_role: student.account_role === "captain" ? "captain" : "student",
    };
  });

export const staffLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => input)
  .handler(async ({ data }) => {
    await ensureDefaultStaff();
    const username = (data.username ?? "").trim();
    const { data: staff } = await db
      .from("staff_users")
      .select("id, username, password_hash")
      .ilike("username", username)
      .maybeSingle();
    const ok = staff ? await verifyPassword(data.password ?? "", staff.password_hash) : false;
    if (!staff || !ok) {
      throw friendly("ইউজারনেম বা পাসওয়ার্ড ভুল হয়েছে।");
    }
    const session = await getSupportSession();
    await session.update({ role: "staff", staffId: staff.id, username: staff.username });
    await logAudit({
      actorType: "staff",
      actorId: staff.id,
      actorName: staff.username,
      eventType: "staff.login",
    });
    return { username: staff.username };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const before = await readSession();
  const session = await getSupportSession();
  await session.clear();
  if (before.role === "student" && before.studentId) {
    await logAudit({
      actorType: "student",
      actorId: before.studentId,
      eventType: "student.logout",
    });
  } else if (before.role === "staff" && before.staffId) {
    await logAudit({
      actorType: "staff",
      actorId: before.staffId,
      actorName: before.username ?? null,
      eventType: "staff.logout",
    });
  }
  return { ok: true };
});
