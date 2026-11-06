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
  saveStudentProfileDetails,
} from "@/lib/student-academic.functions";
import { studentDashboard } from "@/lib/student.functions";
import { bn } from "@/lib/support-constants";
import { useLanguage } from "@/lib/language-context";

export const Route = createFileRoute("/student/profile")({
  head: () => ({
    meta: [
      { title: "Student Profile — Student Support Hub HSC 27 & 28" },
      {
        name: "description",
        content: "Student profile, academic batch, group, and ticket summary for HSC 27 and HSC 28.",
      },
      { property: "og:title", content: "Student Profile — Student Support Hub HSC 27 & 28" },
      { property: "og:description", content: "Student information and support ticket summary." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { student } = Route.useRouteContext();
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();
  const fetchDashboard = useServerFn(studentDashboard);
  const fetchAcademic = useServerFn(getStudentAcademicProfile);
  const saveAcademic = useServerFn(saveStudentAcademicProfile);
  const saveDetails = useServerFn(saveStudentProfileDetails);

  const displayNumber = (value: string | number) =>
    language === "bn" ? bn(value) : String(value).replace(/[০-৯]/g, (digit) =>
      String("০১২৩৪৫৬৭৮৯".indexOf(digit)),
    );

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
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [details, setDetails] = useState({
    class_name: "",
    academic_year: "",
    institution_name: "",
    address: "",
  });
  const [detailsSuccess, setDetailsSuccess] = useState(false);
  const [detailsError, setDetailsError] = useState("");

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

  useEffect(() => {
    if (!academic) return;
    setDetails({
      class_name: academic.class_name ?? "",
      academic_year: academic.academic_year ?? "",
      institution_name: academic.institution_name ?? "",
      address: academic.address ?? "",
    });
  }, [academic]);

  const detailsMutation = useMutation({
    mutationFn: (values: typeof details) => saveDetails({ data: values }),
    onSuccess: async () => {
      setDetailsError("");
      setDetailsSuccess(true);
      await queryClient.invalidateQueries({ queryKey: ["student-academic-profile"] });
    },
    onError: (error) => {
      setDetailsSuccess(false);
      setDetailsError(error instanceof Error ? error.message : t("তথ্য সেভ করা যায়নি।", "Could not save profile details."));
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: {
      academic_batch: AcademicBatch;
      academic_group: AcademicGroup;
    }) => saveAcademic({ data: values }),
    onSuccess: async () => {
      setFormError("");
      setSuccess(true);
      await queryClient.invalidateQueries({ queryKey: ["student-academic-profile"] });
    },
    onError: (error) => {
      setSuccess(false);
      setFormError(error instanceof Error ? error.message : "");
    },
  });

  const batchLocked = Boolean(academic?.academic_batch);
  const groupLocked = Boolean(academic?.academic_group);
  const needsCompletion = !batchLocked || !groupLocked;

  const rows: Array<[string, string]> = [
    [t("নাম", "Name"), student.name],
    [t("যোগাযোগ নম্বর", "Contact Number"), displayNumber(academic?.contact_number ?? student.contact_number)],
    [t("ইমেইল", "Email"), academic?.email || "—"],
    [t("শিক্ষার্থী আইডি", "Student ID"), student.student_code ? displayNumber(student.student_code) : "—"],
    [t("মোট সমস্যা জানানো হয়েছে", "Total Tickets Submitted"), displayNumber(dashboard?.stats.total ?? 0)],
    [t("চলমান সমস্যা", "Open Tickets"), displayNumber(dashboard?.stats.open ?? 0)],
    [t("সমাধান হয়েছে", "Resolved Tickets"), displayNumber(dashboard?.stats.resolved ?? 0)],
  ];

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(false);
    setFormError("");
    if (!batch || !group) {
      setFormError(t("ব্যাচ এবং বিভাগ নির্বাচন করো।", "Please select your batch and academic group."));
      return;
    }
    saveMutation.mutate({ academic_batch: batch, academic_group: group });
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader
        title={t("প্রোফাইল", "Profile")}
        description={t(
          "তোমার শিক্ষার্থী তথ্য, একাডেমিক ব্যাচ ও বিভাগের বিবরণ।",
          "Your student information, academic batch, and group details.",
        )}
      />

      <div className="card-panel divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{value}</span>
          </div>
        ))}
      </div>

      <section className="card-panel space-y-4 p-4">
        <div>
          <h2 className="font-display text-lg font-semibold">
            {t("একাডেমিক তথ্য", "Academic Information")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "তোমার ব্যাচ ও বিভাগ অনুযায়ী কোর্স এবং ক্লাস দেখানো হবে।",
              "Courses and classes are shown according to your batch and academic group.",
            )}
          </p>
        </div>

        {academicLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("তথ্য লোড হচ্ছে...", "Loading information...")}
          </p>
        ) : academicError ? (
          <p role="alert" className="text-sm text-destructive">
            {t(
              "একাডেমিক তথ্য লোড করা যায়নি। পেজটি রিফ্রেশ করো।",
              "Could not load academic information. Please refresh the page.",
            )}
          </p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="profile-batch" className="block text-sm font-medium">
                {t("HSC ব্যাচ", "HSC Batch")}
              </label>
              <select
                id="profile-batch"
                value={batch}
                onChange={(event) => {
                  setBatch(event.target.value as AcademicBatch | "");
                  setSuccess(false);
                }}
                disabled={batchLocked || saveMutation.isPending}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-70"
              >
                <option value="">{t("ব্যাচ নির্বাচন করো", "Select Batch")}</option>
                <option value="hsc_27">{language === "bn" ? BATCH_LABELS.hsc_27.bn : BATCH_LABELS.hsc_27.en}</option>
                <option value="hsc_28">{language === "bn" ? BATCH_LABELS.hsc_28.bn : BATCH_LABELS.hsc_28.en}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-group" className="block text-sm font-medium">
                {t("বিভাগ", "Academic Group")}
              </label>
              <select
                id="profile-group"
                value={group}
                onChange={(event) => {
                  setGroup(event.target.value as AcademicGroup | "");
                  setSuccess(false);
                }}
                disabled={groupLocked || saveMutation.isPending}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-70"
              >
                <option value="">{t("বিভাগ নির্বাচন করো", "Select Group")}</option>
                <option value="science">{GROUP_LABELS.science[language]}</option>
                <option value="business_studies">{GROUP_LABELS.business_studies[language]}</option>
                <option value="humanities">{GROUP_LABELS.humanities[language]}</option>
              </select>
            </div>

            {formError ? (
              <p role="alert" className="text-sm text-destructive">{formError}</p>
            ) : null}
            {success ? (
              <p role="status" className="text-sm text-primary">
                {t("ব্যাচ ও বিভাগের তথ্য সফলভাবে সেভ হয়েছে।", "Batch and academic group saved successfully.")}
              </p>
            ) : null}

            {needsCompletion ? (
              <button
                type="submit"
                disabled={!batch || !group || saveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {t("তথ্য সেভ করো", "Save Information")}
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t(
                  "ব্যাচ বা বিভাগ পরিবর্তন করতে সাপোর্ট টিমের সাথে যোগাযোগ করো।",
                  "Contact the support team to change your batch or academic group.",
                )}
              </p>
            )}
          </form>
        )}
      </section>

      <section className="card-panel space-y-4 p-4">
        <div>
          <h2 className="font-display text-lg font-semibold">
            {t("ব্যক্তিগত ও শিক্ষাপ্রতিষ্ঠানের তথ্য", "Personal & Institution Details")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("নিচের তথ্যগুলো প্রয়োজন অনুযায়ী আপডেট করতে পারো।", "You can update the following details when needed.")}
          </p>
        </div>
        {academicLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("তথ্য লোড হচ্ছে...", "Loading information...")}
          </p>
        ) : academicError ? (
          <p role="alert" className="text-sm text-destructive">
            {t("প্রোফাইলের তথ্য লোড করা যায়নি।", "Could not load profile details.")}
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setDetailsError("");
              setDetailsSuccess(false);
              detailsMutation.mutate(details);
            }}
          >
            {([
              ["class_name", t("ক্লাস", "Class"), 80],
              ["academic_year", t("শিক্ষাবর্ষ / বছর", "Academic Year"), 40],
              ["institution_name", t("স্কুল / কলেজ", "School / College"), 200],
              ["address", t("ঠিকানা", "Address"), 500],
            ] as const).map(([field, label, maxLength]) => (
              <div key={field} className="space-y-2">
                <label htmlFor={`profile-${field}`} className="block text-sm font-medium">
                  {label}
                </label>
                {field === "address" ? (
                  <textarea
                    id={`profile-${field}`}
                    value={details[field]}
                    onChange={(event) => {
                      setDetails((prev) => ({ ...prev, [field]: event.target.value }));
                      setDetailsSuccess(false);
                    }}
                    maxLength={maxLength}
                    rows={3}
                    disabled={detailsMutation.isPending}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-70"
                  />
                ) : (
                  <input
                    id={`profile-${field}`}
                    type="text"
                    value={details[field]}
                    onChange={(event) => {
                      setDetails((prev) => ({ ...prev, [field]: event.target.value }));
                      setDetailsSuccess(false);
                    }}
                    maxLength={maxLength}
                    disabled={detailsMutation.isPending}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-70"
                  />
                )}
              </div>
            ))}
            {detailsError ? <p role="alert" className="text-sm text-destructive">{detailsError}</p> : null}
            {detailsSuccess ? (
              <p role="status" className="text-sm text-primary">
                {t("প্রোফাইলের তথ্য সফলভাবে সেভ হয়েছে।", "Profile details saved successfully.")}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={detailsMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {detailsMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {t("প্রোফাইল সেভ করো", "Save Profile")}
            </button>
          </form>
        )}
      </section>

      <p className="flex items-start gap-2 rounded-lg bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        {t(
          "তোমার নাম ও যোগাযোগ নম্বর ব্যক্তিগত রাখা হয়। এই তথ্য পরিবর্তন করতে সাপোর্ট টিমের সাথে যোগাযোগ করো।",
          "Your name and contact number are kept private. Contact the support team to update this information.",
        )}
      </p>
    </div>
  );
}
