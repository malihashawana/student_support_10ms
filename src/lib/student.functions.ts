import { createServerFn } from "@tanstack/react-start";

import { friendly, requireStudent } from "./session.server";
import { db } from "./support.server";
import { CATEGORIES, STATUSES } from "./support-constants";

export const studentDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const { studentId } = await requireStudent();
  const [{ data: tickets }, { data: notices }] = await Promise.all([
    db
      .from("tickets")
      .select("id, ticket_number, title, category, status, created_at, updated_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
    db
      .from("notices")
      .select("id, title, content, priority, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const list = tickets ?? [];
  return {
    tickets: list.slice(0, 5),
    notices: notices ?? [],
    stats: {
      open: list.filter((t) => t.status !== "Resolved" && t.status !== "Closed").length,
      resolved: list.filter((t) => t.status === "Resolved" || t.status === "Closed").length,
      total: list.length,
    },
  };
});

export const myTickets = createServerFn({ method: "GET" }).handler(async () => {
  const { studentId } = await requireStudent();
  const { data } = await db
    .from("tickets")
    .select("id, ticket_number, title, category, status, created_at, updated_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const myTicketDetail = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data: input }) => {
    const { studentId } = await requireStudent();
    const { data: ticket } = await db
      .from("tickets")
      .select("*")
      .eq("id", input.id)
      .eq("student_id", studentId)
      .maybeSingle();
    if (!ticket) throw friendly("This ticket was not found in your account.");
    const [{ data: messages }, { data: attachments }] = await Promise.all([
      db
        .from("ticket_messages")
        .select("id, sender_type, sender_name, message, created_at")
        .eq("ticket_id", ticket.id)
        .eq("internal", false)
        .order("created_at", { ascending: true }),
      db
        .from("attachments")
        .select("id, file_name, file_type, file_size, external_url, storage_path, created_at")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true }),
    ]);
    return { ticket, messages: messages ?? [], attachments: attachments ?? [] };
  });

export const createTicket = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      category: string;
      title: string;
      description: string;
      course?: string | null;
      class_exam?: string | null;
      link?: string | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    const title = (data.title ?? "").trim();
    const description = (data.description ?? "").trim();
    if (!CATEGORIES.includes(data.category as (typeof CATEGORIES)[number])) {
      throw friendly("Please choose a valid problem category.");
    }
    if (title.length < 5 || title.length > 150) {
      throw friendly("Please write a problem title between 5 and 150 characters.");
    }
    if (description.length < 10 || description.length > 4000) {
      throw friendly("Please describe your problem in at least 10 characters.");
    }
    const { data: ticket, error } = await db
      .from("tickets")
      .insert({
        student_id: studentId,
        category: data.category,
        title,
        description,
        course: data.course?.trim() || null,
        class_exam: data.class_exam?.trim() || null,
        status: "Open",
      })
      .select("id, ticket_number, category, status, created_at")
      .single();
    if (error || !ticket) throw friendly("We couldn't submit your problem. Please try again.");

    await db.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_type: "student",
      sender_name: "Student",
      message: description,
    });

    const link = (data.link ?? "").trim();
    if (link) {
      if (!/^https?:\/\//i.test(link) || link.length > 500) {
        throw friendly("Please provide a valid link starting with http:// or https://");
      }
      await db.from("attachments").insert({
        ticket_id: ticket.id,
        file_name: link,
        file_type: "link",
        external_url: link,
      });
    }
    return ticket;
  });

export const addStudentMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { ticketId: string; message: string }) => input)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    const message = (data.message ?? "").trim();
    if (message.length < 2 || message.length > 4000) {
      throw friendly("Please write your message before sending.");
    }
    const { data: ticket } = await db
      .from("tickets")
      .select("id, status")
      .eq("id", data.ticketId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (!ticket) throw friendly("This ticket was not found in your account.");
    await db.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_type: "student",
      sender_name: "Student",
      message,
    });
    const nextStatus =
      ticket.status === "Waiting for Information" ? "In Review" : (ticket.status as string);
    await db
      .from("tickets")
      .update({ status: STATUSES.includes(nextStatus as never) ? nextStatus : ticket.status })
      .eq("id", ticket.id);
    return { ok: true, status: nextStatus };
  });

export const communityTickets = createServerFn({ method: "POST" })
  .inputValidator((input: { search?: string; category?: string; status?: string }) => input)
  .handler(async ({ data }) => {
    await requireStudent();
    let query = db
      .from("tickets")
      .select(
        "id, ticket_number, category, title, description, course, status, official_response, created_at, resolved_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    const search = (data.search ?? "").trim();
    if (search) {
      const safe = search.replace(/[%,()]/g, " ");
      query = query.or(
        `title.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%,course.ilike.%${safe}%,ticket_number.ilike.%${safe}%,class_exam.ilike.%${safe}%`,
      );
    }
    if (data.category && data.category !== "all") query = query.eq("category", data.category);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    const { data: rows } = await query;
    return rows ?? [];
  });

export const communityTicketDetail = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await requireStudent();
    const { data: ticket } = await db
      .from("tickets")
      .select(
        "id, ticket_number, category, title, description, course, class_exam, status, official_response, created_at, resolved_at, updated_at",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (!ticket) throw friendly("This issue could not be found.");
    return ticket;
  });

export const publishedNotices = createServerFn({ method: "GET" }).handler(async () => {
  await requireStudent();
  const { data } = await db
    .from("notices")
    .select("id, title, content, priority, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });
  return data ?? [];
});
