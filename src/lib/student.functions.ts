import { createServerFn } from "@tanstack/react-start";
import { addDays, getSchedule, normSubject, statusOf, todayDhaka } from "./schedule.server";
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
      title?: string;
      description: string;
      course?: string | null;
      class_exam?: string | null;
      link?: string | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    const suppliedTitle = (data.title ?? "").trim();
    const description = (data.description ?? "").trim();
    const link = (data.link ?? "").trim();
    if (!CATEGORIES.includes(data.category as (typeof CATEGORIES)[number])) {
      throw friendly("সমস্যার সঠিক ধরন নির্বাচন করুন।");
    }
    if (suppliedTitle.length > 150) {
      throw friendly("সমস্যার শিরোনাম ১৫০ অক্ষরের বেশি হতে পারবে না।");
    }
    if (description.length < 10 || description.length > 4000) {
      throw friendly("সমস্যাটি ১০ থেকে ৪০০০ অক্ষরের মধ্যে বর্ণনা করুন।");
    }
    if (link && (!/^https?:\/\//i.test(link) || link.length > 500)) {
      throw friendly("লিংক অবশ্যই http:// বা https:// দিয়ে শুরু হতে হবে এবং ৫০০ অক্ষরের মধ্যে থাকতে হবে।");
    }
    // The database and staff views still require a non-empty title.
    // Generate one only when the student leaves the optional field blank.
    const title = suppliedTitle || `${data.category} Issue`; 

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

    if (link) {
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

// Community endpoints are intentionally disabled. Keep the exported names and
// input signatures temporarily so legacy routes cannot read other students' tickets.
export const communityTickets = createServerFn({ method: "POST" })
  .inputValidator((input: { search?: string; category?: string; status?: string }) => input)
  .handler(async () => {
    await requireStudent();
    throw friendly("সবার সমস্যা ফিচারটি বন্ধ করা হয়েছে।");
  });

export const communityTicketDetail = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async () => {
    await requireStudent();
    throw friendly("সবার সমস্যা ফিচারটি বন্ধ করা হয়েছে।");
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

  export const courseActivity = createServerFn({ method: "GET" }).handler(async () => {
  await requireStudent();

  const [{ data: programs }, { data: courses }, { data: classes }, { data: cache }] = await Promise.all([
    db.from("tenms_programs").select("*").order("group_label").order("subject_name_en"),
    db.from("tenms_courses").select("*").order("id"),
    db.from("tenms_classes").select("*").order("class_no"),
    db.from("tenms_catalog_cache").select("*"),
  ]);

  type ClassRow = {
    id: string;
    course_id: number;
    class_no: number;
    title: string;
    status: string;
    scheduled_on: string | null;
    resource_url: string | null;
    note: string | null;
    updated_at: string;
  };

  const cacheByProduct = new Map((cache ?? []).map((row) => [row.product_id, row]));

  const tally = (rows: ClassRow[]) => {
    const count = (status: string) => rows.filter((item) => item.status === status).length;
    return {
      uploaded: count("uploaded"),
      pending: count("pending"),
      missing: count("missing"),
      scheduled: count("scheduled"),
      total: rows.length,
    };
  };

  return (programs ?? []).map((program) => {
    const programCourses = (courses ?? []).filter((c) => c.program_id === program.id);
    const courseRows = programCourses.map((course) => {
      const courseClasses = ((classes ?? []) as ClassRow[]).filter((c) => c.course_id === course.id);
      return {
        id: course.id,
        name_en: course.name_en,
        name_bn: course.name_bn,
        classes: courseClasses,
        ...tally(courseClasses),
      };
    });

    const allClasses = courseRows.flatMap((c) => c.classes);
    const totals = tally(allClasses);
    const cached = cacheByProduct.get(program.catalog_product_id);
    const payload = (cached?.payload ?? null) as Record<string, unknown> | null;
    const lastUpload =
      allClasses
        .filter((c) => c.status === "uploaded")
        .map((c) => c.updated_at)
        .sort()
        .at(-1) ?? null;

    return {
      id: program.id,
      groupLabel: program.group_label,
      subjectNameEn: program.subject_name_en,
      subjectNameBn: program.subject_name_bn,
      courses: courseRows,
      ...totals,
      progress: totals.total === 0 ? 0 : Math.round((totals.uploaded / totals.total) * 100),
      lastUpload,
      live: payload
        ? {
            title: String(payload["title"] ?? program.subject_name_en),
            thumbnail: (payload["thumbnail"] as string | null) ?? null,
            startAt: (payload["startAt"] as string | null) ?? null,
            availability: (payload["availability"] as string | null) ?? null,
            instructors:
              (payload["instructors"] as { name: string; image: string | null }[] | undefined) ?? [],
            checklist: (payload["checklist"] as string[] | undefined) ?? [],
            fetchedAt: String(cached?.fetched_at ?? payload["fetchedAt"] ?? ""),
          }
        : null,
    };
  });
});

async function loadSchedule() {
  try {
    return await getSchedule();
  } catch {
    throw friendly("ক্লাস রুটিন এখন লোড করা যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।");
  }
}

export const upcomingClasses = createServerFn({ method: "GET" }).handler(async () => {
  await requireStudent();
  const rows = await loadSchedule();
  const today = todayDhaka();
  const end = addDays(today, 6);
  const items = rows
    .filter((r) => r.date >= today && r.date <= end)
    .map((r) => ({
      id: r.id,
      date: r.date,
      time: r.time,
      slot: r.slot,
      courseLabel: r.courseLabel,
      subject: r.subject,
      chapter: r.chapter,
      title: r.title,
      teacher: r.teacher,
      link: r.link,
      recorded: r.recorded,
    }));
  return { today, items };
});

/**
 * Course Structure is an HSC 28-only feature.
 * The linked Google Sheet is exclusively HSC 28 data.
 * Department filtering happens on the server, not only in the UI.
 */
function academicGroupFromLabel(
  label: string,
): "science" | "business_studies" | "humanities" | "common" | null {
  const normalized = label.trim().toLowerCase();
  if (normalized === "আবশ্যিক" || /common|compulsory|all groups/.test(normalized)) {
    return "common";
  }
  if (normalized === "বিজ্ঞান" || normalized === "science") return "science";
  if (
    normalized === "ব্যবসায় শিক্ষা" ||
    normalized === "ব্যবসায় শিক্ষা" ||
    /business|commerce/.test(normalized)
  ) return "business_studies";
  if (normalized === "মানবিক" || /humanities|arts/.test(normalized)) return "humanities";
  return null;
}

/** Google Sheet names can be Bengali while tenms_courses names are English. */
const SHEET_SUBJECT_ALIASES: Record<string, string[]> = {
  bangla: ["bangla", "বাংলা"],
  english: ["english", "ইংরেজি"],
  ict: ["ict", "আইসিটি"],
  physics: ["physics", "ফিজিক্স", "পদার্থবিজ্ঞান"],
  chemistry: ["chemistry", "কেমিস্ট্রি", "রসায়ন", "রসায়ন"],
  biology: ["biology", "বায়োলজি", "বায়োলজি", "জীববিজ্ঞান"],
  highermath: ["higher math", "higher mathematics", "math", "ম্যাথ", "উচ্চতর গণিত"],
  accounting: ["accounting", "একাউন্টিং", "অ্যাকাউন্টিং", "হিসাববিজ্ঞান"],
  finance: ["finance", "ফাইন্যান্স"],
  marketing: ["marketing", "মার্কেটিং"],
  management: ["management", "ম্যানেজমেন্ট"],
  economics: ["economics", "ইকোনমিক্স", "অর্থনীতি"],
  geography: ["geography", "জিওগ্রাফি", "ভূগোল"],
  civics: ["civics", "পৌরনীতি"],
};

function sheetSubjectKey(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  for (const [key, aliases] of Object.entries(SHEET_SUBJECT_ALIASES)) {
    if (aliases.some((alias) => normalized === alias ||
      normalized.startsWith(`${alias} `) || normalized.startsWith(`${alias} -`) ||
      normalized.startsWith(`${alias}–`))) return key;
  }
  return null;
}

function paperNumber(value: string): 1 | 2 | null {
  if (/(?:1st|first|1\s*st|১ম|প্রথম)\s*(?:paper|পত্র)/i.test(value)) return 1;
  if (/(?:2nd|second|2\s*nd|২য়|২য়|দ্বিতীয়|দ্বিতীয়)\s*(?:paper|পত্র)/i.test(value)) return 2;
  return null;
}

function sheetRowSubjectKey(row: { courseLabel: string; subject: string }): string | null {
  // The full HSC 28 course name is the most reliable source of subject.
  const suffix = row.courseLabel.split(/\s+-\s+/).at(-1) ?? row.courseLabel;
  return sheetSubjectKey(suffix) ?? sheetSubjectKey(row.subject);
}

export const courseSchedule = createServerFn({ method: "GET" }).handler(async () => {
  const { studentId } = await requireStudent();
  const { data: student, error: studentError } = await db
    .from("students")
    .select("academic_batch, academic_group, status")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student || student.status !== "active") {
    throw friendly("শিক্ষার্থীর তথ্য পাওয়া যায়নি।");
  }

  const today = todayDhaka();
  if (student.academic_batch !== "hsc_28") {
    return { today, programs: [], needsAcademicProfile: false, unavailableForBatch: true };
  }
  if (!student.academic_group || !["science", "business_studies", "humanities"].includes(student.academic_group)) {
    return { today, programs: [], needsAcademicProfile: true, unavailableForBatch: false };
  }

  const [{ data: programs, error: programError }, { data: courses, error: courseError }] =
    await Promise.all([
      db.from("tenms_programs")
        .select("id, subject_name_en, subject_name_bn, group_label, academic_batch")
        .order("group_label")
        .order("subject_name_bn"),
      db.from("tenms_courses")
        .select("id, program_id, name_en, name_bn")
        .order("id"),
    ]);

  if (programError || courseError) {
    throw friendly("কোর্সের তথ্য লোড করা যায়নি।");
  }

  const eligiblePrograms = (programs ?? []).filter((program) => {
    const department = academicGroupFromLabel(program.group_label ?? "");
    return (
      (program.academic_batch === "both" || program.academic_batch === "hsc_28") &&
      (department === "common" || department === student.academic_group)
    );
  });

  // This Google Sheet is exclusively HSC 28. Reject any unexpected batch rows.
  const rows = (await loadSchedule()).filter((row) =>
    /(?:^|\s)HSC\s*28(?:\s|$)/i.test(row.courseLabel),
  );
  const bySubject = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = sheetRowSubjectKey(row);
    if (!key) continue;
    const list = bySubject.get(key) ?? [];
    list.push(row);
    bySubject.set(key, list);
  }

  const result = eligiblePrograms.map((program) => {
    const subjectKey = sheetSubjectKey(program.subject_name_en) ??
      sheetSubjectKey(program.subject_name_bn);
    const subjectRows = subjectKey ? (bySubject.get(subjectKey) ?? []) : [];
    const programCourses = (courses ?? []).filter((course) => course.program_id === program.id);

    const courseList = programCourses.map((course) => {
      const coursePaper = paperNumber(`${course.name_en} ${course.name_bn}`);
      // If a subject has two papers, only map a row when its paper is known.
      // This prevents showing the same uploaded class under both papers.
      const hasMultiplePapers = programCourses.some((c) =>
        c.id !== course.id && paperNumber(`${c.name_en} ${c.name_bn}`) !== null,
      );
      const found = subjectRows.filter((row) => {
        const rowPaper = paperNumber(`${row.subject} ${row.courseLabel}`);
        if (coursePaper !== null) return rowPaper === coursePaper;
        return !hasMultiplePapers && rowPaper === null;
      });

      const classes = found.map((row) => ({
        id: row.id,
        date: row.date,
        time: row.time,
        chapter: row.chapter,
        title: row.title,
        exam: row.exam,
        slide: row.slide,
        link: row.link,
        status: statusOf(row, today),
      }));

      return {
        id: course.id,
        name_bn: course.name_bn,
        classes,
        uploaded: classes.filter((item) => item.status === "uploaded").length,
        pending: classes.filter((item) => item.status === "pending").length,
        scheduled: classes.filter((item) => item.status === "scheduled").length,
      };
    });

    return {
      id: program.id,
      groupLabel: program.group_label,
      subjectNameBn: program.subject_name_bn,
      courses: courseList,
      uploaded: courseList.reduce((total, course) => total + course.uploaded, 0),
      pending: courseList.reduce((total, course) => total + course.pending, 0),
      scheduled: courseList.reduce((total, course) => total + course.scheduled, 0),
    };
  });

  return { today, programs: result, needsAcademicProfile: false, unavailableForBatch: false };
});


export const classSubjectOptions = createServerFn({ method: "GET" }).handler(async () => {
  await requireStudent();
  const rows = await loadSchedule();
  const set = new Set<string>();
  for (const r of rows) {
    const s = r.subject.trim();
    if (s) set.add(s);
  }
  return { subjects: Array.from(set).sort((a, b) => a.localeCompare(b)) };
});

export const upcomingForSubjects = createServerFn({ method: "POST" })
  .inputValidator((input: { subjects: string[] }) => ({
    subjects: Array.isArray(input?.subjects)
      ? input.subjects
          .map((s) => String(s).trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 40)
      : [],
  }))
  .handler(async ({ data }) => {
    await requireStudent();
    const rows = await loadSchedule();
    const today = todayDhaka();
    const end = addDays(today, 45);
    const wanted = new Set(data.subjects);
    const items = rows
      .filter((r) => r.date >= today && r.date <= end && wanted.has(r.subject.trim().toLowerCase()))
      .map((r) => ({
        id: r.id,
        date: r.date,
        time: r.time,
        subject: r.subject,
        chapter: r.chapter,
        title: r.title,
        teacher: r.teacher,
        link: r.link,
      }));
    return { today, items };
  });

  const PAPER_RE = /\s*[-–]?\s*(1st|2nd)\s*paper\s*$/i;
const GROUP_ORDER = [
  "bangla",
  "english",
  "ict",
  "physics",
  "chemistry",
  "higher math",
  "math",
  "biology",
  "management",
  "marketing",
];

function baseSubject(s: string) {
  return s.replace(PAPER_RE, "").trim();
}

export const upcomingAll = createServerFn({ method: "GET" }).handler(async () => {
  await requireStudent();
  const rows = await loadSchedule();
  const today = todayDhaka();
  const end = addDays(today, 45);

  const names = new Set<string>();
  for (const r of rows) {
    const b = baseSubject(r.subject);
    if (b) names.add(b);
  }
  const rank = (n: string) => {
    const i = GROUP_ORDER.indexOf(n.toLowerCase());
    return i === -1 ? 999 : i;
  };
  const groups = Array.from(names).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  const items = rows
    .filter((r) => r.date >= today && r.date <= end && r.subject.trim())
    .map((r) => ({
      id: r.id,
      date: r.date,
      time: r.time,
      group: baseSubject(r.subject),
      subject: r.subject,
      title: r.title,
      teacher: r.teacher,
      link: r.link,
    }));

  return { today, groups, items };
});