import { createServerFn } from "@tanstack/react-start";

import { friendly, hashPassword, requireStaff, verifyPassword } from "./session.server";
import { analyzeStudentCsv, db, normalizeContact, toCsv } from "./support.server";
import { STATUSES } from "./support-constants";

export type StaffTicketFilters = {
  search?: string;
  status?: string;
  category?: string;
  course?: string;
  range?: "all" | "today" | "yesterday" | "7d" | "30d" | "custom";
  from?: string;
  to?: string;
};

export const staffOverview = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const { data: tickets } = await db
    .from("tickets")
    .select("id, ticket_number, title, category, status, created_at, updated_at, official_response")
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
        "id, ticket_number, category, title, description, course, class_exam, status, official_response, handled_by, created_at, updated_at, is_demo, students(name, contact_number, student_code)",
      )
      .order("created_at", { ascending: false })
      .limit(2000);

    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.category && data.category !== "all") query = query.eq("category", data.category);
    if (data.course && data.course !== "all") query = query.eq("course", data.course);

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
    const list = rows ?? [];
    if (!search) return list;
    return list.filter((t) =>
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
    if (!ticket) throw friendly("This ticket could not be found.");
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
    const { username } = await requireStaff();
    const patch: {
      status?: string;
      resolved_at?: string;
      official_response?: string | null;
      handled_by?: string;
    } = {};
    if (data.status) {
      if (!STATUSES.includes(data.status as never)) throw friendly("Invalid status selected.");
      patch.status = data.status;
      if (data.status === "Resolved") patch.resolved_at = new Date().toISOString();
    }
    if (typeof data.response === "string") patch.official_response = data.response.trim() || null;
    if (typeof data.handled_by === "string")
      patch.handled_by = data.handled_by.trim() || username;

    const { error } = await db.from("tickets").update(patch).eq("id", data.id);
    if (error) throw friendly("We couldn't update this ticket. Please try again.");

    if (data.sendResponse && data.response?.trim()) {
      await db.from("ticket_messages").insert({
        ticket_id: data.id,
        sender_type: "staff",
        sender_name: username,
        message: data.response.trim(),
      });
    }
    return { ok: true };
  });

export const staffAddMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { ticketId: string; message: string; internal?: boolean }) => input)
  .handler(async ({ data }) => {
    const { username } = await requireStaff();
    const message = (data.message ?? "").trim();
    if (message.length < 2) throw friendly("Please write a message before sending.");
    await db.from("ticket_messages").insert({
      ticket_id: data.ticketId,
      sender_type: "staff",
      sender_name: username,
      message,
      internal: Boolean(data.internal),
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
        t.official_response,
        t.handled_by,
        t.created_at,
        t.updated_at,
      ]),
    );
  });

/* ----------------------------- Student database ---------------------------- */

export const listStudents = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const { data } = await db
    .from("students")
    .select("id, name, contact_number, student_code, email, status, is_demo, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  return data ?? [];
});

export const previewStudentCsv = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    if (!data.text?.trim()) throw friendly("Upload failed. The file appears to be empty.");
    const analysis = await analyzeStudentCsv(data.text);
    if (analysis.detected === 0) {
      throw friendly("Upload failed. Please check the file type and its column headers.");
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
          student_code: s.student_code,
          email: s.email,
        })),
      );
      if (error) throw friendly("Import failed. Please check the file and try again.");
      inserted = analysis.valid.length;
    }
    if (data.updateExisting) {
      for (const row of analysis.duplicates) {
        await db
          .from("students")
          .update({ name: row.name, student_code: row.student_code, email: row.email })
          .eq("contact_number", row.contact_number);
        updated++;
      }
    }
    return { inserted, updated, skipped: analysis.invalid.length };
  });

export const saveStudent = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      contact_number: string;
      student_code?: string | null;
      email?: string | null;
      status?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    await requireStaff();
    const name = (data.name ?? "").trim();
    const contact = normalizeContact(data.contact_number ?? "");
    if (!name) throw friendly("Please enter the student's name.");
    if (contact.length < 6) throw friendly("Please enter a valid contact number.");
    const payload = {
      name,
      contact_number: contact,
      student_code: data.student_code?.trim() || null,
      email: data.email?.trim() || null,
      status: data.status || "active",
    };
    const { error } = data.id
      ? await db.from("students").update(payload).eq("id", data.id)
      : await db.from("students").insert(payload);
    if (error) {
      throw friendly(
        error.code === "23505"
          ? "That contact number already exists in the student database."
          : "We couldn't save this student. Please try again.",
      );
    }
    return { ok: true };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    const { error } = await db.from("students").delete().eq("id", data.id);
    if (error) throw friendly("We couldn't delete this student. Please try again.");
    return { ok: true };
  });

export const exportStudentsCsv = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const { data } = await db
    .from("students")
    .select("name, contact_number, student_code, email, status, created_at")
    .order("created_at", { ascending: false });
  return toCsv(
    ["name", "contact_number", "student_id", "email", "status", "date_added"],
    (data ?? []).map((s) => [
      s.name,
      s.contact_number,
      s.student_code,
      s.email,
      s.status,
      s.created_at,
    ]),
  );
});

/* --------------------------------- Notices -------------------------------- */

export const listNotices = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const { data } = await db
    .from("notices")
    .select("*")
    .order("created_at", { ascending: false });
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
    if (title.length < 3) throw friendly("Please enter a notice title.");
    if (content.length < 3) throw friendly("Please enter the notice description.");
    const payload = {
      title,
      content,
      priority: data.priority || "Normal",
      published: data.published ?? true,
    };
    const { error } = data.id
      ? await db.from("notices").update(payload).eq("id", data.id)
      : await db.from("notices").insert(payload);
    if (error) throw friendly("We couldn't save this notice. Please try again.");
    return { ok: true };
  });

export const deleteNotice = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    await db.from("notices").delete().eq("id", data.id);
    return { ok: true };
  });

/* -------------------------------- Settings -------------------------------- */

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { username } = await requireStaff();
  const { data } = await db.from("app_settings").select("key, value");
  const settings = {
    categories: [] as string[],
    courses: [] as string[],
    upload: { max_file_mb: 8, max_files: 5 },
  };
  for (const row of data ?? []) {
    if (row.key === "categories" && Array.isArray(row.value)) settings.categories = row.value as string[];
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
    if (!allowed.includes(data.key)) throw friendly("This setting cannot be changed.");
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
    if (!staff) throw friendly("Your session has expired. Please sign in again.");
    if (!(await verifyPassword(data.currentPassword ?? "", staff.password_hash))) {
      throw friendly("Your current password is incorrect.");
    }
    const patch: { username?: string; password_hash?: string } = {};
    if (data.username?.trim()) patch.username = data.username.trim();
    if (data.newPassword) {
      if (data.newPassword.length < 8) {
        throw friendly("The new password must be at least 8 characters.");
      }
      patch.password_hash = await hashPassword(data.newPassword);
    }
    if (Object.keys(patch).length === 0) throw friendly("Nothing to update.");
    const { error } = await db.from("staff_users").update(patch).eq("id", staffId);
    if (error) throw friendly("We couldn't update the credentials. Please try again.");
    return { ok: true };
  });
