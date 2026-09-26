import { createServerFn } from "@tanstack/react-start";

import { logAudit } from "./audit.server";
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
    if (!ticket) throw friendly("এই সমস্যাটি আপনার অ্যাকাউন্টে পাওয়া যায়নি।");
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
      throw friendly("সমস্যার সঠিক ধরন নির্বাচন করুন।");
    }
    if (title.length < 5 || title.length > 150) {
      throw friendly("সমস্যার শিরোনাম ৫ থেকে ১৫০ অক্ষরের মধ্যে লিখুন।");
    }
    if (description.length < 10 || description.length > 4000) {
      throw friendly("সমস্যাটি অন্তত ১০ অক্ষরে বর্ণনা করুন।");
    }

    // source_role is still recorded for context (shown as a small "captain"
    // tag in staff/captain views), but it no longer elevates priority on its
    // own -- priority now only changes when a captain explicitly approves
    // the ticket (see captain.functions.ts: captainSetApproval).
    const { data: requester } = await db
      .from("students")
      .select("account_role")
      .eq("id", studentId)
      .maybeSingle();
    const isCaptain = requester?.account_role === "captain";

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
        priority: "normal",
        source_role: isCaptain ? "captain" : "student",
      })
      .select("id, ticket_number, category, status, created_at")
      .single();
    if (error || !ticket) throw friendly("সমস্যাটি জমা দেওয়া যায়নি। আবার চেষ্টা করুন।");

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

    await logAudit({
      actorType: "student",
      actorId: studentId,
      eventType: "ticket.created",
      targetType: "ticket",
      targetId: ticket.id,
      metadata: {
        category: data.category,
        priority: "normal",
        source_role: isCaptain ? "captain" : "student",
      },
    });

    return ticket;
  });

export const addStudentMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { ticketId: string; message: string }) => input)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    const message = (data.message ?? "").trim();
    if (message.length < 2 || message.length > 4000) {
      throw friendly("পাঠানোর আগে আপনার বার্তাটি লিখুন।");
    }
    const { data: ticket } = await db
      .from("tickets")
      .select("id, status")
      .eq("id", data.ticketId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (!ticket) throw friendly("এই সমস্যাটি আপনার অ্যাকাউন্টে পাওয়া যায়নি।");
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

    await logAudit({
      actorType: "student",
      actorId: studentId,
      eventType: "ticket.message_sent",
      targetType: "ticket",
      targetId: ticket.id,
    });

    return { ok: true, status: nextStatus };
  });

export const communityTickets = createServerFn({ method: "POST" })
  .inputValidator((input: { search?: string; category?: string; status?: string }) => input)
  .handler(async ({ data }) => {
    await requireStudent();
    let query = db
      .from("tickets")
      .select(
        "id, ticket_number, category, title, description, course, status, priority, source_role, approved_by_captain_name, approved_at, official_response, created_at, resolved_at",
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
    if (!ticket) throw friendly("সমস্যাটি খুঁজে পাওয়া যায়নি।");
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
export const unseenResolvedTickets = createServerFn({ method: "GET" }).handler(async () => {
  const { studentId } = await requireStudent();
  const { data: student } = await db
    .from("students")
    .select("resolved_notifications_seen_at")
    .eq("id", studentId)
    .maybeSingle();
  const since = student?.resolved_notifications_seen_at ?? "1970-01-01T00:00:00.000Z";
  const { data: tickets } = await db
    .from("tickets")
    .select("id, ticket_number, title, resolved_at")
    .eq("student_id", studentId)
    .eq("status", "Resolved")
    .gt("resolved_at", since)
    .order("resolved_at", { ascending: false });
  return tickets ?? [];
});

export const acknowledgeResolvedNotifications = createServerFn({ method: "POST" }).handler(
  async () => {
    const { studentId } = await requireStudent();
    await db
      .from("students")
      .update({ resolved_notifications_seen_at: new Date().toISOString() })
      .eq("id", studentId);
    return { ok: true };
  },
);

export const studyTasksByRange = createServerFn({ method: "GET" })
  .inputValidator((data: { from: string; to: string }) => data)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    const { data: tasks } = await db
      .from("study_tasks")
      .select("id, title, subject, task_date, is_done, created_at")
      .eq("student_id", studentId)
      .gte("task_date", data.from)
      .lte("task_date", data.to)
      .order("task_date", { ascending: true });
    return tasks ?? [];
  });

export const createStudyTask = createServerFn({ method: "POST" })
  .inputValidator((data: { title: string; subject?: string; task_date: string }) => data)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    const { data: task, error } = await db
      .from("study_tasks")
      .insert({
        student_id: studentId,
        title: data.title,
        subject: data.subject ?? null,
        task_date: data.task_date,
      })
      .select("id, title, subject, task_date, is_done, created_at")
      .single();
    if (error) throw new Error(error.message);
    return task;
  });

export const toggleStudyTask = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; is_done: boolean }) => data)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    await db
      .from("study_tasks")
      .update({ is_done: data.is_done })
      .eq("id", data.id)
      .eq("student_id", studentId);
    return { ok: true };
  });

export const deleteStudyTask = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    await db.from("study_tasks").delete().eq("id", data.id).eq("student_id", studentId);
    return { ok: true };
  });

  export const listStudyNotes = createServerFn({ method: "GET" }).handler(async () => {
  const { studentId } = await requireStudent();
  const { data } = await db
    .from("student_notes")
    .select("id, title, subject, content, created_at, updated_at")
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false });
  return data ?? [];
});

export const createStudyNote = createServerFn({ method: "POST" })
  .inputValidator((data: { title: string; subject?: string; content: string }) => data)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    const { data: note, error } = await db
      .from("student_notes")
      .insert({
        student_id: studentId,
        title: data.title,
        subject: data.subject ?? null,
        content: data.content,
      })
      .select("id, title, subject, content, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return note;
  });

export const updateStudyNote = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id: string; title: string; subject?: string; content: string }) => data,
  )
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    const { data: note, error } = await db
      .from("student_notes")
      .update({
        title: data.title,
        subject: data.subject ?? null,
        content: data.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("student_id", studentId)
      .select("id, title, subject, content, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return note;
  });

export const deleteStudyNote = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    await db.from("student_notes").delete().eq("id", data.id).eq("student_id", studentId);
    return { ok: true };
  });


  export const vocabQuizSet = createServerFn({ method: "GET" }).handler(async () => {
  await requireStudent();
  const { data } = await db.from("vocab_words").select("id, word, meaning");
  const words = data ?? [];
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  const quizWords = shuffled.slice(0, 10);
  const allMeanings = words.map((w) => w.meaning);

  return quizWords.map((w) => {
    const wrongPool = allMeanings.filter((m) => m !== w.meaning);
    const wrongOptions = [...wrongPool].sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...wrongOptions, w.meaning].sort(() => Math.random() - 0.5);
    return { id: w.id, word: w.word, options, answer: w.meaning };
  });
});

export const tenmsCourseStructure = createServerFn({ method: "GET" }).handler(async () => {
  await requireStudent();
  const { data: programs } = await db
    .from("tenms_programs")
    .select("id, subject_name_en, subject_name_bn, group_label")
    .order("group_label", { ascending: true })
    .order("subject_name_bn", { ascending: true });
  const { data: courses } = await db
    .from("tenms_courses")
    .select("id, program_id, name_en, name_bn")
    .order("id", { ascending: true });

  const programList = programs ?? [];
  const courseList = courses ?? [];

  return programList.map((p) => ({
    ...p,
    courses: courseList.filter((c) => c.program_id === p.id),
  }));
});

export const courseNotesForCourse = createServerFn({ method: "GET" })
  .inputValidator((data: { courseId: number }) => data)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    const { data: requester } = await db
      .from("students")
      .select("account_role")
      .eq("id", studentId)
      .maybeSingle();
    const isCaptain = requester?.account_role === "captain";

    const { data: notes } = await db
      .from("course_notes")
      .select(
        "id, content, status, author_id, created_at, file_name, file_type, file_url, students(name)",
      )
      .eq("course_id", data.courseId)
      .order("created_at", { ascending: false });

    const list = notes ?? [];
    const visible = list.filter((n) => n.status === "approved" || n.author_id === studentId);

    const noteIds = visible.map((n) => n.id);
    const { data: reactions } = noteIds.length
      ? await db.from("course_note_reactions").select("note_id, student_id").in("note_id", noteIds)
      : { data: [] as { note_id: string; student_id: string }[] };

    const reactionList = reactions ?? [];
    const countByNote: Record<string, number> = {};
    const lovedByMe = new Set<string>();
    for (const r of reactionList) {
      countByNote[r.note_id] = (countByNote[r.note_id] ?? 0) + 1;
      if (r.student_id === studentId) lovedByMe.add(r.note_id);
    }

    return {
      isCaptain,
      notes: visible.map((n) => ({
        id: n.id,
        content: n.content,
        status: n.status,
        isMine: n.author_id === studentId,
        authorName: n.students?.name ?? "ক্যাপ্টেন",
        created_at: n.created_at,
        fileName: n.file_name,
        fileType: n.file_type,
        fileUrl: n.file_url,
        loveCount: countByNote[n.id] ?? 0,
        lovedByMe: lovedByMe.has(n.id),
      })),
    };
  });

export const createCourseNote = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      courseId: number;
      caption?: string;
      fileName: string;
      fileType: string;
      fileBase64: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    const { data: requester } = await db
      .from("students")
      .select("account_role")
      .eq("id", studentId)
      .maybeSingle();
    if (requester?.account_role !== "captain") {
      throw friendly("শুধু ক্যাপ্টেনরাই নোট আপলোড করতে পারবে।");
    }

    const fileName = (data.fileName ?? "").trim();
    const fileType = (data.fileType ?? "").trim();
    const isImage = fileType.startsWith("image/");
    const isPdf = fileType === "application/pdf";
    if (!fileName || !(isImage || isPdf)) {
      throw friendly("শুধু ছবি (jpg/png) অথবা PDF ফাইল আপলোড করা যাবে।");
    }

    const buffer = Buffer.from(data.fileBase64, "base64");
    const MAX_BYTES = 4 * 1024 * 1024; // 4MB
    if (buffer.length > MAX_BYTES) {
      throw friendly("ফাইলের সাইজ ৪ MB-এর বেশি হতে পারবে না।");
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.courseId}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await db.storage
      .from("course-notes")
      .upload(path, buffer, { contentType: fileType, upsert: false });
    if (uploadError) throw friendly("ফাইলটি আপলোড করা যায়নি। আবার চেষ্টা করো।");

    const { data: pub } = db.storage.from("course-notes").getPublicUrl(path);

    const caption = (data.caption ?? "").trim().slice(0, 500);

    const { error } = await db.from("course_notes").insert({
      course_id: data.courseId,
      author_id: studentId,
      content: caption,
      file_name: fileName,
      file_type: fileType,
      file_url: pub.publicUrl,
      storage_path: path,
      status: "pending",
    });
    if (error) throw friendly("নোটটি সংরক্ষণ করা যায়নি। আবার চেষ্টা করো।");
    return { ok: true };
  });

export const toggleNoteLove = createServerFn({ method: "POST" })
  .inputValidator((data: { noteId: string }) => data)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    const { data: existing } = await db
      .from("course_note_reactions")
      .select("id")
      .eq("note_id", data.noteId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (existing) {
      await db.from("course_note_reactions").delete().eq("id", existing.id);
      return { loved: false };
    }
    await db.from("course_note_reactions").insert({ note_id: data.noteId, student_id: studentId });
    return { loved: true };
  });