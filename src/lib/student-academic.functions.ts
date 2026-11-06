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
      .select("id, name, academic_batch, academic_group, status")
      .eq("id", studentId)
      .maybeSingle();

    if (error || !data || data.status !== "active") {
      throw friendly("প্রোফাইলের তথ্য লোড করা যায়নি।");
    }

    return {
      academic_batch: data.academic_batch,
      academic_group: data.academic_group,
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

    // Existing choices are locked to prevent students from accessing
    // another cohort's content simply by switching their profile.
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
