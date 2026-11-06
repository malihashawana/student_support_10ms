import { createServerFn } from "@tanstack/react-start";
import {
  isAcademicBatch,
  isAcademicGroup,
  type AcademicBatch,
  type AcademicGroup,
} from "./academic-config";
import { logAudit } from "./audit.server";
import { friendly, requireStudent } from "./session.server";
import { db } from "./support.server";

export const getStudentAcademicProfile = createServerFn({ method: "GET" })
  .handler(async () => {
    const { studentId } = await requireStudent();
    const { data, error } = await db
      .from("students")
      .select("id, name, email, contact_number, academic_batch, academic_group, class_name, academic_year, institution_name, address, status")
      .eq("id", studentId)
      .maybeSingle();

    if (error || !data || data.status !== "active") {
      throw friendly("প্রোফাইলের তথ্য লোড করা যায়নি।");
    }

    return {
      academic_batch: data.academic_batch,
      academic_group: data.academic_group,
      class_name: data.class_name,
      academic_year: data.academic_year,
      institution_name: data.institution_name,
      address: data.address,
      email: data.email,
      contact_number: data.contact_number,
    };
  });

export const saveStudentAcademicProfile = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      academic_batch: AcademicBatch;
      academic_group: AcademicGroup;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();

    if (!isAcademicBatch(data.academic_batch)) {
      throw friendly("সঠিক HSC ব্যাচ নির্বাচন করুন।");
    }
    if (!isAcademicGroup(data.academic_group)) {
      throw friendly("সঠিক বিভাগ নির্বাচন করুন।");
    }

    const { data: existing, error: readError } = await db
      .from("students")
      .select("id, status, academic_batch, academic_group")
      .eq("id", studentId)
      .maybeSingle();

    if (readError || !existing || existing.status !== "active") {
      throw friendly("আপনার অ্যাকাউন্টটি সক্রিয় নয়। সাপোর্ট টিমের সাথে যোগাযোগ করুন।");
    }

    // Once set, batch and group cannot be changed by the student.
    if (existing.academic_batch && existing.academic_batch !== data.academic_batch) {
      throw friendly("ব্যাচ পরিবর্তন করতে সাপোর্ট টিমের সাথে যোগাযোগ করুন।");
    }
    if (existing.academic_group && existing.academic_group !== data.academic_group) {
      throw friendly("বিভাগ পরিবর্তন করতে সাপোর্ট টিমের সাথে যোগাযোগ করুন।");
    }

    let updateQuery = db
      .from("students")
      .update({
        academic_batch: data.academic_batch,
        academic_group: data.academic_group,
      })
      .eq("id", studentId)
      .eq("status", "active");

    updateQuery = existing.academic_batch === null
      ? updateQuery.is("academic_batch", null)
      : updateQuery.eq("academic_batch", existing.academic_batch);
    updateQuery = existing.academic_group === null
      ? updateQuery.is("academic_group", null)
      : updateQuery.eq("academic_group", existing.academic_group);

    const { data: updated, error } = await updateQuery
      .select("id, academic_batch, academic_group")
      .maybeSingle();

    if (error || !updated) {
      throw friendly("তথ্য সেভ করা যায়নি। আবার চেষ্টা করুন।");
    }

    await logAudit({
      actorType: "student",
      actorId: studentId,
      eventType: "student.academic_profile_updated",
      targetType: "student",
      targetId: studentId,
      metadata: {
        academic_batch: updated.academic_batch,
        academic_group: updated.academic_group,
      },
    });

    return {
      academic_batch: updated.academic_batch,
      academic_group: updated.academic_group,
    };
  });

export type StudentProfileDetailsInput = {
  class_name: string;
  academic_year: string;
  institution_name: string;
  address: string;
};

function cleanProfileField(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string") {
    throw friendly(`${label} সঠিকভাবে লিখুন।`);
  }
  const cleaned = value.trim();
  if (cleaned.length > maxLength) {
    throw friendly(`${label} সর্বোচ্চ ${maxLength} অক্ষরের হতে পারবে।`);
  }
  return cleaned || null;
}

export const saveStudentProfileDetails = createServerFn({ method: "POST" })
  .inputValidator((input: StudentProfileDetailsInput) => input)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    if (!data || typeof data !== "object") {
      throw friendly("সঠিক প্রোফাইল তথ্য দিন।");
    }

    const values = {
      class_name: cleanProfileField(data.class_name, "ক্লাস", 80),
      academic_year: cleanProfileField(data.academic_year, "শিক্ষাবর্ষ", 40),
      institution_name: cleanProfileField(data.institution_name, "শিক্ষাপ্রতিষ্ঠান", 200),
      address: cleanProfileField(data.address, "ঠিকানা", 500),
    };

    const { data: updated, error } = await db
      .from("students")
      .update(values)
      .eq("id", studentId)
      .eq("status", "active")
      .select("id, class_name, academic_year, institution_name, address")
      .maybeSingle();

    if (error || !updated) {
      throw friendly("প্রোফাইলের তথ্য সেভ করা যায়নি। আবার চেষ্টা করুন।");
    }

    await logAudit({
      actorType: "student",
      actorId: studentId,
      eventType: "student.profile_details_updated",
      targetType: "student",
      targetId: studentId,
      metadata: {
        updated_fields: ["class_name", "academic_year", "institution_name", "address"],
      },
    });

    return {
      class_name: updated.class_name,
      academic_year: updated.academic_year,
      institution_name: updated.institution_name,
      address: updated.address,
    };
  });
