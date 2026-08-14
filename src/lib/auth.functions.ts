import { createServerFn } from "@tanstack/react-start";

import { getSupportSession, readSession, verifyPassword, friendly } from "./session.server";
import { db, ensureDefaultStaff, normalizeContact } from "./support.server";

export type CurrentUser =
  | { role: "guest" }
  | {
      role: "student";
      id: string;
      name: string;
      contact_number: string;
      student_code: string | null;
      email: string | null;
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
        .select("id, name, contact_number, student_code, email")
        .eq("id", data.studentId)
        .maybeSingle();
      if (student) return { role: "student", ...student };
    }
    return { role: "guest" };
  },
);

export const studentLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { contact: string }) => input)
  .handler(async ({ data }) => {
    const contact = normalizeContact(data.contact ?? "");
    if (contact.length < 6) {
      throw friendly("সঠিক মোবাইল / লগইন নম্বর দিন।");
    }
    const { data: student } = await db
      .from("students")
      .select("id, name, status")
      .eq("contact_number", contact)
      .maybeSingle();
    if (!student) {
      throw friendly(
        "আপনার নম্বরটি রেজিস্টার্ড শিক্ষার্থী তালিকায় পাওয়া যায়নি। সাপোর্ট টিমের সাথে যোগাযোগ করুন।",
      );
    }
    if (student.status !== "active") {
      throw friendly("আপনার শিক্ষার্থী অ্যাকাউন্টটি বন্ধ আছে। সাপোর্ট টিমের সাথে যোগাযোগ করুন।");
    }
    const session = await getSupportSession();
    await session.update({ role: "student", studentId: student.id });
    return { name: student.name };
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
    return { username: staff.username };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getSupportSession();
  await session.clear();
  return { ok: true };
});
