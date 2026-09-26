import { createServerFn } from "@tanstack/react-start";

import { friendly, readSession } from "./session.server";
import { db } from "./support.server";
import { logAudit } from "./audit.server";

async function requireCaptain() {
  const session = await readSession();
  if (session.role !== "student" || !session.studentId) {
    throw friendly("এই পেজটি দেখতে লগইন করুন।");
  }
  const { data: student } = await db
    .from("students")
    .select("id, name, status, account_role")
    .eq("id", session.studentId)
    .maybeSingle();
  if (!student || student.status !== "active") {
    throw friendly("আপনার অ্যাকাউন্টটি সক্রিয় নয়।");
  }
  if (student.account_role !== "captain") {
    throw friendly("এই ফিচারটি শুধু ক্যাপ্টেনদের জন্য।");
  }
  return student;
}

export type CaptainTicketFilters = {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
};

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2 };

export const captainAllTickets = createServerFn({ method: "GET" })
  .inputValidator((input: CaptainTicketFilters) => input)
  .handler(async ({ data }) => {
    await requireCaptain();

    let query = db
      .from("tickets")
      .select(
        "id, ticket_number, category, title, status, priority, source_role, course, class_exam, created_at, resolved_at, approved_by_captain_name, approved_at, students(name, login_number)",
      )
      .eq("is_demo", false);

    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.category && data.category !== "all") query = query.eq("category", data.category);
    if (data.priority && data.priority !== "all") query = query.eq("priority", data.priority);
    if (data.search) {
      query = query.or(`title.ilike.%${data.search}%,ticket_number.ilike.%${data.search}%`);
    }

    const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(300);
    if (error) throw friendly("সমস্যার তালিকা লোড করা যায়নি।");

    return (rows ?? []).slice().sort((a, b) => {
      const rankA = PRIORITY_RANK[a.priority ?? "normal"] ?? 2;
      const rankB = PRIORITY_RANK[b.priority ?? "normal"] ?? 2;
      if (rankA !== rankB) return rankA - rankB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  });

export const captainSetApproval = createServerFn({ method: "POST" })
  .inputValidator((input: { ticket_id: string; approve: boolean }) => input)
  .handler(async ({ data }) => {
    const captain = await requireCaptain();

    const { data: ticket } = await db
      .from("tickets")
      .select("id, priority, approved_by_captain_id")
      .eq("id", data.ticket_id)
      .maybeSingle();
    if (!ticket) throw friendly("সমস্যাটি খুঁজে পাওয়া যায়নি।");

    if (data.approve) {
      const nextPriority = ticket.priority === "urgent" ? "urgent" : "high";
      const { error } = await db
        .from("tickets")
        .update({
          priority: nextPriority,
          approved_by_captain_id: captain.id,
          approved_by_captain_name: captain.name,
          approved_at: new Date().toISOString(),
        })
        .eq("id", data.ticket_id);
      if (error) throw friendly("অনুমোদন করা যায়নি। আবার চেষ্টা করুন।");

      await logAudit({
        actorType: "student",
        actorId: captain.id,
        actorName: captain.name,
        eventType: "ticket.captain_approved",
        targetType: "ticket",
        targetId: data.ticket_id,
      });
    } else {
      // Only clears the elevation if a captain approval is what set it --
      // never silently downgrades a priority staff set independently.
      if (!ticket.approved_by_captain_id) {
        throw friendly("এই সমস্যাটি কোনো ক্যাপ্টেন অনুমোদন করেননি।");
      }
      const { error } = await db
        .from("tickets")
        .update({
          priority: "normal",
          approved_by_captain_id: null,
          approved_by_captain_name: null,
          approved_at: null,
        })
        .eq("id", data.ticket_id);
      if (error) throw friendly("বাতিল করা যায়নি। আবার চেষ্টা করুন।");

      await logAudit({
        actorType: "student",
        actorId: captain.id,
        actorName: captain.name,
        eventType: "ticket.captain_unapproved",
        targetType: "ticket",
        targetId: data.ticket_id,
      });
    }

    return { ok: true };
  });
