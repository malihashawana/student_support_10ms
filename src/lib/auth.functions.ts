import { createServerFn } from "@tanstack/react-start";

import {
  assertLoginNotRateLimited,
  clearLoginAttempts,
  friendly,
  getSupportSession,
  readSession,
  recordFailedLogin,
  verifyPassword,
} from "./session.server";
import { logAudit } from "./audit.server";
import { db, ensureDefaultStaff, normalizeLoginNumber } from "./support.server";

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

export const studentLogin = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { login_number: string; tms_transaction_id: string; email?: string }) => input,
  )
  .handler(async ({ data }) => {
    const login_number = normalizeLoginNumber(data.login_number ?? "");
    const tms = normalizeTmsInput(data.tms_transaction_id ?? "");
    const email = data.email?.trim() || null;

    if (login_number.length < 6) throw friendly("সঠিক লগইন নম্বর দিন।");
    if (!tms) throw friendly("TMS ট্রানজেকশন আইডি দিন।");

    const rateLimitKey = `student:${login_number}`;
    assertLoginNotRateLimited(rateLimitKey);

    const deny = (): never => {
      recordFailedLogin(rateLimitKey);
      throw friendly("লগইন নম্বর, TMS ট্রানজেকশন আইডি অথবা ইমেইল মিলছে না।");
    };

    const { data: student } = await db
      .from("students")
      .select("id, name, status, tms_transaction_ids, email, account_role")
      .eq("login_number", login_number)
      .maybeSingle();

    if (!student) deny();
    if (student.status !== "active") {
      // Distinct message on purpose: this is an account-state issue, not a
      // credential guess, so it doesn't count against the rate limit.
      throw friendly(
        "আপনার শিক্ষার্থী অ্যাকাউন্টটি নিষ্ক্রিয় আছে। সাপোর্ট টিমের সাথে যোগাযোগ করুন।",
      );
    }
    if (!(student.tms_transaction_ids ?? []).includes(tms)) deny();
    if (email && (student.email ?? "").trim().toLowerCase() !== email.toLowerCase()) deny();

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
      actorName: before.username,
      eventType: "staff.logout",
    });
  }
  return { ok: true };
});
