import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import {
  BATCH_LABELS,
  GROUP_LABELS,
  type AcademicBatch,
  type AcademicGroup,
} from "@/lib/academic-config";
import {
  getStudentAcademicProfile,
  saveStudentAcademicProfile,
} from "@/lib/student-academic.functions";
import { studentDashboard } from "@/lib/student.functions";
import { bn } from "@/lib/support-constants";

export const Route = createFileRoute("/student/profile")({
  head: () => ({
    meta: [
      { title: "প্রোফাইল — স্টুডেন্ট সাপোর্ট হাব" },
      {
        name: "description",
        content: "তোমার নিবন্ধিত শিক্ষার্থী তথ্য, ব্যাচ, বিভাগ ও রিপোর্টের সারাংশ।",
      },
      { property: "og:title", content: "প্রোফাইল — স্টুডেন্ট সাপোর্ট হাব" },
      { property: "og:description", content: "নিবন্ধিত শিক্ষার্থীর তথ্য ও টিকিট সারাংশ।" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { student } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchDashboard = useServerFn(studentDashboard);
  const fetchAcademic = useServerFn(getStudentAcademicProfile);
  const saveAcademic = useServerFn(saveStudentAcademicProfile);

  const { data: dashboard } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => fetchDashboard(),
  });
  const {
    data: academic,
    isLoading: academicLoading,
    error: academicError,
  } = useQuery({
    queryKey: ["student-academic-profile"],
    queryFn: () => fetchAcademic(),
  });

  const [batch, setBatch] = useState<AcademicBatch | "">("");
  const [group, setGroup] = useState<AcademicGroup | "">("");
  const [success, setSuccess] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!academic) return;
    setBatch(
      academic.academic_batch === "hsc_27" || academic.academic_batch === "hsc_28"
        ? academic.academic_batch
        : "",
    );
    setGroup(
      academic.academic_group === "science" ||
      academic.academic_group === "business_studies" ||
      academic.academic_group === "humanities"
        ? academic.academic_group
        : "",
    );
  }, [academic]);

  const saveMutation = useMutation({
    mutationFn: (values: {
      academic_batch: AcademicBatch;
      academic_group: AcademicGroup;
    }) => saveAcademic({ data: values }),
    onSuccess: async () => {
      setFormError("");
      setSuccess("ব্যাচ ও বিভাগের তথ্য সফলভাবে সেভ হয়েছে।");
      await queryClient.invalidateQueries({ queryKey: ["student-academic-profile"] });
    },
    onError: (error) => {
      setSuccess("");
      setFormError(
        error instanceof Error ? error.message : "তথ্য সেভ করা যায়নি।",
      );
    },
  });

  const batchLocked = Boolean(academic?.academic_batch);
  const groupLocked = Boolean(academic?.academic_group);
  const needsCompletion = !batchLocked || !groupLocked;

  const rows: Array<[string, string]> = [
    ["নাম", student.name],
    ["যোগাযোগ নম্বর", bn(student.contact_number)],
    ["শিক্ষার্থী আইডি", student.student_code ? bn(student.student_code) : "—"],
    ["মোট সমস্যা জানানো হয়েছে", bn(dashboard?.stats.total ?? 0)],
    ["চলমান সমস্যা", bn(dashboard?.stats.open ?? 0)],
    ["সমাধান হয়েছে", bn(dashboard?.stats.resolved ?? 0)],
  ];

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess("");
    setFormError("");
    if (!batch || !group) {
      setFormError("ব্যাচ এবং বিভাগ নির্বাচন করো।");
      return;
    }
    saveMutation.mutate({ academic_batch: batch, academic_group: group });
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader
        title="প্রোফাইল"
        description="তোমার শিক্ষার্থী তথ্য, একাডেমিক ব্যাচ ও বিভাগের বিবরণ।"
      />

      <div className="card-panel divide-y divide-border">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{value}</span>
          </div>
        ))}
      </div>

      <section className="card-panel space-y-4 p-4">
        <div>
          <h2 className="font-display text-lg font-semibold">একাডেমিক তথ্য</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            তোমার ব্যাচ ও বিভাগ অনুযায়ী কোর্স এবং ক্লাস দেখানো হবে।
          </p>
        </div>

        {academicLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            তথ্য লোড হচ্ছে...
          </p>
        ) : academicError ? (
          <p role="alert" className="text-sm text-destructive">
            একাডেমিক তথ্য লোড করা যায়নি। পেজটি রিফ্রেশ করো।
          </p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="profile-batch" className="block text-sm font-medium">
                HSC ব্যাচ
              </label>
              <select
                id="profile-batch"
                value={batch}
                onChange={(event) => {
                  setBatch(event.target.value as AcademicBatch | "");
                  setSuccess("");
                }}
                disabled={batchLocked || saveMutation.isPending}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-70"
              >
                <option value="">ব্যাচ নির্বাচন করো</option>
                <option value="hsc_27">{BATCH_LABELS.hsc_27.en}</option>
                <option value="hsc_28">{BATCH_LABELS.hsc_28.en}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-group" className="block text-sm font-medium">
                বিভাগ
              </label>
              <select
                id="profile-group"
                value={group}
                onChange={(event) => {
                  setGroup(event.target.value as AcademicGroup | "");
                  setSuccess("");
                }}
                disabled={groupLocked || saveMutation.isPending}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-70"
              >
                <option value="">বিভাগ নির্বাচন করো</option>
                <option value="science">{GROUP_LABELS.science.bn}</option>
                <option value="business_studies">
                  {GROUP_LABELS.business_studies.bn}
                </option>
                <option value="humanities">{GROUP_LABELS.humanities.bn}</option>
              </select>
            </div>

            {formError ? (
              <p role="alert" className="text-sm text-destructive">{formError}</p>
            ) : null}
            {success ? (
              <p role="status" className="text-sm text-primary">{success}</p>
            ) : null}

            {needsCompletion ? (
              <button
                type="submit"
                disabled={!batch || !group || saveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                তথ্য সেভ করো
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                ব্যাচ বা বিভাগ পরিবর্তন করতে সাপোর্ট টিমের সাথে যোগাযোগ করো।
              </p>
            )}
          </form>
        )}
      </section>

      <p className="flex items-start gap-2 rounded-lg bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        তোমার নাম ও যোগাযোগ নম্বর সবার সমস্যা বোর্ডে দেখানো হয় না।
        এই তথ্য পরিবর্তন করতে সাপোর্ট টিমের সাথে যোগাযোগ করো।
      </p>
    </div>
  );
}
