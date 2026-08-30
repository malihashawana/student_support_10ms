import { createServerFn } from "@tanstack/react-start";
import { logAudit } from "./audit.server";
import { sendResolutionEmail } from "./email.server";
import { friendly, hashPassword, requireStaff, verifyPassword } from "./session.server";
import {
  analyzeStudentCsv,
  db,
  isValidTmsTransactionId,
  normalizeLoginNumber,
  splitTmsField,
  toCsv,
} from "./support.server";
import { STATUSES } from "./support-constants";

export type StaffTicketFilters = {
  search?: string;
  status?: string;
  category?: string;
  course?: string;
  priority?: string;
  range?: "all" | "today" | "yesterday" | "7d" | "30d" | "custom";
  from?: string;
  to?: string;
};

export const staffOverview = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const { data: tickets } = await db
    .from("tickets")
    .select(
      "id, ticket_number, title, category, status, created_at, updated_at, official_response",
    )
    .order("updated_at", { ascending: false })
    .limit(2000);

  const list = tickets ?? [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const byStatus: Record<string, number> = {};
  for (const s of STATUSES) byStatus[s] = 0;
  const byCategory: Record<string, number> = {};
  for (const t of list) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
  }

  const { count: studentCount } = await db
    .from("students")
    .select("id", { count: "exact", head: true });

  return {
    total: list.length,
    byStatus,
    topCategories: Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    today: list.filter((t) => new Date(t.created_at) >= startOfToday).length,
    recent: list.slice(0, 8),
    students: studentCount ?? 0,
    awaitingResponse: list.filter((t) => !t.official_response && t.status !== "Closed").length,
  };
});

export const staffTickets = createServerFn({ method: "POST" })
  .inputValidator((input: StaffTicketFilters) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    let query = db
      .from("tickets")
      .select(
        "id, ticket_number, category, title, description, course, class_exam, status, priority, source_role, official_response, handled_by, created_at, updated_at, is_demo, students(name, contact_number, student_code)",
      )
      .order("created_at", { ascending: false })
      .limit(2000);

    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.category && data.category !== "all") query = query.eq("category", data.category);
    if (data.course && data.course !== "all") query = query.eq("course", data.course);
    if (data.priority && data.priority !== "all") query = query.eq("priority", data.priority);

    const now = new Date();
    const startOfDay = (d: Date) => {
      const c = new Date(d);
      c.setHours(0, 0, 0, 0);
      return c;
    };

    if (data.range === "today") query = query.gte("created_at", startOfDay(now).toISOString());
    else if (data.range === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      query = query
        .gte("created_at", startOfDay(y).toISOString())
        .lt("created_at", startOfDay(now).toISOString());
    } else if (data.range === "7d" || data.range === "30d") {
      const d = new Date(now);
      d.setDate(d.getDate() - (data.range === "7d" ? 7 : 30));
      query = query.gte("created_at", d.toISOString());
    } else if (data.range === "custom") {
      if (data.from) query = query.gte("created_at", new Date(data.from).toISOString());
      if (data.to) {
        const to = new Date(data.to);
        to.setHours(23, 59, 59, 999);
        query = query.lte("created_at", to.toISOString());
      }
    }

    const { data: rows } = await query;
    const search = (data.search ?? "").trim().toLowerCase();
    let list = rows ?? [];
    if (search) {
      list = list.filter((t) =>
        [
          t.ticket_number,
          t.title,
          t.description,
          t.category,
          t.course,
          t.class_exam,
          t.students?.name,
          t.students?.contact_number,
          t.students?.student_code,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(search)),
      );
    }

    const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
    return [...list].sort((a, b) => {
      const rankDiff = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  });

export const staffTicketDetail = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    const { data: ticket } = await db
      .from("tickets")
      .select("*, students(id, name, contact_number, student_code, email)")
      .eq("id", data.id)
      .maybeSingle();
    if (!ticket) throw friendly("সমস্যাটি খুঁজে পাওয়া যায়নি।");

    const [{ data: messages }, { data: attachments }] = await Promise.all([
      db
        .from("ticket_messages")
        .select("id, sender_type, sender_name, message, internal, created_at")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true }),
      db
        .from("attachments")
        .select("id, file_name, file_type, file_size, external_url, storage_path, created_at")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true }),
    ]);

    return { ticket, messages: messages ?? [], attachments: attachments ?? [] };
  });

export const staffUpdateTicket = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id: string;
      status?: string;
      response?: string;
      handled_by?: string;
      sendResponse?: boolean;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { staffId, username } = await requireStaff();
    const patch: {
      status?: string;
      resolved_at?: string;
      official_response?: string | null;
      handled_by?: string;
    } = {};

    if (data.status) {
      if (!STATUSES.includes(data.status as never)) throw friendly("সঠিক অবস্থা নির্বাচন করুন।");
      patch.status = data.status;
      if (data.status === "Resolved") patch.resolved_at = new Date().toISOString();
    }
    if (typeof data.response === "string") patch.official_response = data.response.trim() || null;
    if (typeof data.handled_by === "string")
      patch.handled_by = data.handled_by.trim() || username;

    const { error } = await db.from("tickets").update(patch).eq("id", data.id);
    if (error) throw friendly("সমস্যাটি আপডেট করা যায়নি। আবার চেষ্টা করুন।");

    if (patch.status) {
      await logAudit({
        actorType: "staff",
        actorId: staffId,
        actorName: username,
        eventType: "ticket.status_changed",
        targetType: "ticket",
        targetId: data.id,
        metadata: { status: patch.status },
      });
    }

    if (data.sendResponse && data.response?.trim()) {
      await db.from("ticket_messages").insert({
        ticket_id: data.id,
        sender_type: "staff",
        sender_name: username,
        message: data.response.trim(),
      });
      await logAudit({
        actorType: "staff",
        actorId: staffId,
        actorName: username,
        eventType: "ticket.response_sent",
        targetType: "ticket",
        targetId: data.id,
      });
    }

    // A failed email must never fail the ticket update itself — the result
    // is surfaced to staff so they can retry via resendResolutionEmail.
    const emailStatus =
      data.status === "Resolved" ? await tryResolutionEmail(data.id) : "not_applicable";

    return { ok: true, emailStatus };
  });

/**
 * Sends at most once per ticket, guarded by resolved_email_sent_at. Never
 * throws: a delivery failure is reported back as a status string, not an
 * exception, so it can't take down the ticket update that triggered it.
 */
async function tryResolutionEmail(
  ticketId: string,
): Promise<"not_applicable" | "sent" | "already_sent" | "failed"> {
  const { data: ticket } = await db
    .from("tickets")
    .select(
      "id, ticket_number, title, status, official_response, resolved_email_sent_at, students(email, name)",
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket || ticket.status !== "Resolved") return "not_applicable";
  if (ticket.resolved_email_sent_at) return "already_sent";
  const email = ticket.students?.email;
  if (!email) return "not_applicable";

  try {
    await sendResolutionEmail({
      to: email,
      studentName: ticket.students?.name ?? "শিক্ষার্থী",
      ticketNumber: ticket.ticket_number,
      title: ticket.title,
      officialResponse: ticket.official_response,
    });
    await db
      .from("tickets")
      .update({ resolved_email_sent_at: new Date().toISOString() })
      .eq("id", ticketId);
    return "sent";
  } catch (err) {
    console.error("resolution email failed", err);
    return "failed";
  }
}

export const resendResolutionEmail = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    const status = await tryResolutionEmail(data.id);
    if (status === "failed") throw friendly("ইমেইল পাঠানো যায়নি। আবার চেষ্টা করুন।");
    if (status === "not_applicable") {
      throw friendly(
        "এই টিকেটের জন্য ইমেইল পাঠানো সম্ভব নয় (স্ট্যাটাস Resolved নয় অথবা শিক্ষার্থীর ইমেইল নেই)।",
      );
    }
    return { status };
  });

export const staffAddMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { ticketId: string; message: string; internal?: boolean }) => input)
  .handler(async ({ data }) => {
    const { staffId, username } = await requireStaff();
    const message = (data.message ?? "").trim();
    if (message.length < 2) throw friendly("পাঠানোর আগে বার্তাটি লিখুন।");
    await db.from("ticket_messages").insert({
      ticket_id: data.ticketId,
      sender_type: "staff",
      sender_name: username,
      message,
      internal: Boolean(data.internal),
    });
    await logAudit({
      actorType: "staff",
      actorId: staffId,
      actorName: username,
      eventType: "ticket.message_sent",
      targetType: "ticket",
      targetId: data.ticketId,
    });
    return { ok: true };
  });

export const exportTicketsCsv = createServerFn({ method: "POST" })
  .inputValidator((input: StaffTicketFilters) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    const rows = await staffTickets({ data });
    return toCsv(
      [
        "Ticket ID",
        "Student Name",
        "Contact Number",
        "Student ID",
        "Category",
        "Title",
        "Description",
        "Course",
        "Class/Exam",
        "Status",
        "Priority",
        "Source",
        "Response",
        "Handled By",
        "Submitted Date",
        "Updated Date",
      ],
      rows.map((t) => [
        t.ticket_number,
        t.students?.name,
        t.students?.contact_number,
        t.students?.student_code,
        t.category,
        t.title,
        t.description,
        t.course,
        t.class_exam,
        t.status,
        t.priority,
        t.source_role,
        t.official_response,
        t.handled_by,
        t.created_at,
        t.updated_at,
      ]),
    );
  });

/* -------------------------------- Student database -------------------------------- */

export const listStudents = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const { data } = await db
    .from("students")
    .select(
      "id, name, contact_number, login_number, tms_transaction_ids, course_names, student_code, email, account_role, status, deactivated_at, deactivation_reason, is_demo, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(5000);
  return data ?? [];
});

export const previewStudentCsv = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    if (!data.text?.trim()) throw friendly("আপলোড হয়নি। ফাইলটি ফাঁকা মনে হচ্ছে।");
    const analysis = await analyzeStudentCsv(data.text);
    if (analysis.detected === 0) {
      throw friendly("আপলোড হয়নি। ফাইলের ধরন ও কলাম হেডার দেখে নিন।");
    }
    return {
      detected: analysis.detected,
      validCount: analysis.valid.length,
      duplicateCount: analysis.duplicates.length,
      invalidCount: analysis.invalid.length,
      unmappedHeaders: analysis.unmappedHeaders,
      sample: analysis.valid.slice(0, 10),
      duplicates: analysis.duplicates.slice(0, 10),
      invalid: analysis.invalid.slice(0, 10),
    };
  });

export const importStudentCsv = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string; updateExisting?: boolean }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    const analysis = await analyzeStudentCsv(data.text);
    let inserted = 0;
    let updated = 0;

    if (analysis.valid.length) {
      const { error } = await db.from("students").insert(
        analysis.valid.map((s) => ({
          name: s.name,
          contact_number: s.contact_number,
          login_number: s.login_number,
          tms_transaction_ids: s.tms_transaction_ids,
          course_names: s.course_names,
          student_code: s.student_code,
          email: s.email,
          account_role: s.account_role,
          status: s.status,
        })),
      );
      if (error) throw friendly("ইমপোর্ট হয়নি। ফাইলটি দেখে আবার চেষ্টা করুন।");
      inserted = analysis.valid.length;
    }

    if (data.updateExisting) {
      for (const row of analysis.duplicates) {
        const { data: existing } = await db
          .from("students")
          .select("tms_transaction_ids, course_names")
          .eq("login_number", row.login_number)
          .maybeSingle();

        const mergedTms = [
          ...new Set([...(existing?.tms_transaction_ids ?? []), ...row.tms_transaction_ids]),
        ];
        const mergedCourses = [
          ...new Set([...(existing?.course_names ?? []), ...row.course_names]),
        ];

        const { error } = await db
          .from("students")
          .update({
            name: row.name,
            student_code: row.student_code,
            email: row.email,
            tms_transaction_ids: mergedTms,
            course_names: mergedCourses,
            account_role: row.account_role,
          })
          .eq("login_number", row.login_number);
        if (!error) updated++;
      }
    }

    return { inserted, updated, skipped: analysis.invalid.length };
  });

export const saveStudent = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      login_number: string;
      tms_transaction_ids: string;
      course_names?: string;
      student_code?: string | null;
      email?: string | null;
      account_role?: "student" | "captain";
      status?: "active" | "inactive";
    }) => input,
  )
  .handler(async ({ data }) => {
    const { staffId, username } = await requireStaff();

    const name = (data.name ?? "").trim();
    if (!name) throw friendly("শিক্ষার্থীর নাম লিখুন।");

    const login_number = normalizeLoginNumber(data.login_number ?? "");
    if (login_number.length < 6) throw friendly("সঠিক লগইন নম্বর লিখুন।");

    const tms_transaction_ids = splitTmsField(data.tms_transaction_ids ?? "");
    const invalidTms = tms_transaction_ids.filter((code) => !isValidTmsTransactionId(code));
    if (tms_transaction_ids.length === 0)
      throw friendly("অন্তত একটি সঠিক TMS ট্রানজেকশন আইডি দিন।");
    if (invalidTms.length)
      throw friendly(`TMS আইডি এমন হতে হবে: TMS44500684 (ভুল: ${invalidTms[0]})`);

    const course_names = (data.course_names ?? "")
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);

    const email = data.email?.trim() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw friendly("সঠিক ইমেইল ঠিকানা লিখুন।");

    let previousRole: string | null = null;
    if (data.id) {
      const { data: existing } = await db
        .from("students")
        .select("account_role")
        .eq("id", data.id)
        .maybeSingle();
      previousRole = existing?.account_role ?? null;
    }

    const payload = {
      name,
      contact_number: login_number,
      login_number,
      tms_transaction_ids,
      course_names,
      student_code: data.student_code?.trim() || null,
      email,
      account_role: data.account_role === "captain" ? "captain" : "student",
      status: data.status === "inactive" ? "inactive" : "active",
    };

    const { error } = data.id
      ? await db.from("students").update(payload).eq("id", data.id)
      : await db.from("students").insert(payload);

    if (error) {
      throw friendly(
        error.code === "23505"
          ? "এই লগইন নম্বরটি ডেটাবেজে আগে থেকেই আছে।"
          : "শিক্ষার্থীর তথ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
      );
    }

    if (data.id && previousRole !== payload.account_role) {
      await logAudit({
        actorType: "staff",
        actorId: staffId,
        actorName: username,
        eventType:
          payload.account_role === "captain" ? "captain.role_granted" : "captain.role_removed",
        targetType: "student",
        targetId: data.id,
      });
    }

    return { ok: true };
  });

/**
 * Soft-delete only. Hard-deleting used to cascade and destroy the student's
 * tickets and messages, which is unsafe. A deactivated student keeps their
 * history but can no longer log in (enforced in auth.functions.ts).
 */
export const deactivateStudent = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; reason?: string }) => input)
  .handler(async ({ data }) => {
    const { staffId, username } = await requireStaff();
    const reason = data.reason?.trim().slice(0, 200) || null;
    const { error } = await db
      .from("students")
      .update({
        status: "inactive",
        deactivated_at: new Date().toISOString(),
        deactivation_reason: reason,
      })
      .eq("id", data.id);
    if (error) throw friendly("শিক্ষার্থীকে নিষ্ক্রিয় করা যায়নি। আবার চেষ্টা করুন।");
    await logAudit({
      actorType: "staff",
      actorId: staffId,
      actorName: username,
      eventType: "student.deactivated",
      targetType: "student",
      targetId: data.id,
      metadata: reason ? { reason } : {},
    });
    return { ok: true };
  });

export const reactivateStudent = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { staffId, username } = await requireStaff();
    const { error } = await db
      .from("students")
      .update({ status: "active", deactivated_at: null, deactivation_reason: null })
      .eq("id", data.id);
    if (error) throw friendly("শিক্ষার্থীকে সক্রিয় করা যায়নি। আবার চেষ্টা করুন।");
    await logAudit({
      actorType: "staff",
      actorId: staffId,
      actorName: username,
      eventType: "student.reactivated",
      targetType: "student",
      targetId: data.id,
    });
    return { ok: true };
  });

export const exportStudentsCsv = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const { data } = await db
    .from("students")
    .select(
      "name, login_number, tms_transaction_ids, email, course_names, account_role, status, student_code, created_at",
    )
    .order("created_at", { ascending: false });

  return toCsv(
    [
      "name",
      "login_number",
      "tms_transaction_id",
      "email",
      "course_name",
      "account_role",
      "status",
      "student_id",
      "date_added",
    ],
    (data ?? []).map((s) => [
      s.name,
      s.login_number,
      (s.tms_transaction_ids ?? []).join(","),
      s.email,
      (s.course_names ?? []).join(", "),
      s.account_role,
      s.status,
      s.student_code,
      s.created_at,
    ]),
  );
});

/* ---------------------------------- Notices ---------------------------------- */

export const listNotices = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const { data } = await db.from("notices").select("*").order("created_at", { ascending: false });
  return data ?? [];
});

export const saveNotice = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      title: string;
      content: string;
      priority?: string;
      published?: boolean;
    }) => input,
  )
  .handler(async ({ data }) => {
    await requireStaff();
    const title = (data.title ?? "").trim();
    const content = (data.content ?? "").trim();
    if (title.length < 3) throw friendly("নোটিশের শিরোনাম লিখুন।");
    if (content.length < 3) throw friendly("নোটিশের বিবরণ লিখুন।");
    const payload = {
      title,
      content,
      priority: data.priority || "Normal",
      published: data.published ?? true,
    };
    const { error } = data.id
      ? await db.from("notices").update(payload).eq("id", data.id)
      : await db.from("notices").insert(payload);
    if (error) throw friendly("নোটিশটি সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।");
    return { ok: true };
  });

export const deleteNotice = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    await db.from("notices").delete().eq("id", data.id);
    return { ok: true };
  });

/* ---------------------------------- Settings ---------------------------------- */

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { username } = await requireStaff();
  const { data } = await db.from("app_settings").select("key, value");
  const settings = {
    categories: [] as string[],
    courses: [] as string[],
    upload: { max_file_mb: 8, max_files: 5 },
  };
  for (const row of data ?? []) {
    if (row.key === "categories" && Array.isArray(row.value))
      settings.categories = row.value as string[];
    if (row.key === "courses" && Array.isArray(row.value)) settings.courses = row.value as string[];
    if (row.key === "upload" && row.value && typeof row.value === "object")
      settings.upload = { ...settings.upload, ...(row.value as Record<string, number>) };
  }
  const { data: staff } = await db.from("staff_users").select("id, username, role, created_at");
  return { settings, staff: staff ?? [], username };
});

export const updateSetting = createServerFn({ method: "POST" })
  .inputValidator((input: { key: string; value: unknown }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    const allowed = ["categories", "upload", "courses"];
    if (!allowed.includes(data.key)) throw friendly("এই সেটিংটি পরিবর্তন করা যাবে না।");
    await db
      .from("app_settings")
      .upsert(
        { key: data.key, value: data.value as never, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    return { ok: true };
  });

export const updateStaffCredentials = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { currentPassword: string; username?: string; newPassword?: string }) => input,
  )
  .handler(async ({ data }) => {
    const { staffId } = await requireStaff();
    const { data: staff } = await db
      .from("staff_users")
      .select("id, password_hash")
      .eq("id", staffId)
      .maybeSingle();
    if (!staff) throw friendly("আপনার সেশনের সময় শেষ হয়েছে। আবার লগইন করুন।");
    if (!(await verifyPassword(data.currentPassword ?? "", staff.password_hash))) {
      throw friendly("আপনার বর্তমান পাসওয়ার্ড ভুল।");
    }
    const patch: { username?: string; password_hash?: string } = {};
    if (data.username?.trim()) patch.username = data.username.trim();
    if (data.newPassword) {
      if (data.newPassword.length < 8) {
        throw friendly("নতুন পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।");
      }
      patch.password_hash = await hashPassword(data.newPassword);
    }
    if (Object.keys(patch).length === 0) throw friendly("আপডেট করার কিছু নেই।");
    const { error } = await db.from("staff_users").update(patch).eq("id", staffId);
    if (error) throw friendly("লগইন তথ্য আপডেট করা যায়নি। আবার চেষ্টা করুন।");
    return { ok: true };
  });

export const listAuditLogs = createServerFn({ method: "POST" })
  .inputValidator((input: { eventType?: string; limit?: number }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    let query = db
      .from("audit_logs")
      .select(
        "id, actor_type, actor_id, actor_name, event_type, target_type, target_id, metadata, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.eventType && data.eventType !== "all") query = query.eq("event_type", data.eventType);
    const { data: rows } = await query;
    return rows ?? [];
  });