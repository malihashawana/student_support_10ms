import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Plus, Search, Trash2, Upload, UserPlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteStudent,
  exportStudentsCsv,
  importStudentCsv,
  listStudents,
  previewStudentCsv,
  saveStudent,
} from "@/lib/staff.functions";
import { bn, downloadCsv, formatDateShortBn } from "@/lib/support-constants";

export const Route = createFileRoute("/staff/students")({
  head: () => ({
    meta: [
      { title: "শিক্ষার্থী ডেটাবেজ — Student Support Hub HSC 28" },
      {
        name: "description",
        content:
          "কন্টাক্ট নম্বর দিয়ে লগইনের জন্য ব্যবহৃত নিবন্ধিত HSC 28 শিক্ষার্থী তালিকা আপলোড, সম্পাদনা ও এক্সপোর্ট করুন।",
      },
      { property: "og:title", content: "শিক্ষার্থী ডেটাবেজ — Student Support Hub HSC 28" },
      { property: "og:description", content: "নিবন্ধিত শিক্ষার্থী ও CSV ইম্পোর্ট পরিচালনা করুন।" },
    ],
  }),
  component: StudentDatabase,
});

type StudentForm = {
  id?: string;
  name: string;
  contact_number: string;
  student_code: string;
  email: string;
};

const emptyForm: StudentForm = { name: "", contact_number: "", student_code: "", email: "" };

function StudentDatabase() {
  const fetchStudents = useServerFn(listStudents);
  const preview = useServerFn(previewStudentCsv);
  const doImport = useServerFn(importStudentCsv);
  const save = useServerFn(saveStudent);
  const remove = useServerFn(deleteStudent);
  const exportCsv = useServerFn(exportStudentsCsv);
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [form, setForm] = useState<StudentForm | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof preview>> | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-students"],
    queryFn: () => fetchStudents(),
  });

  const rows = (data ?? []).filter((s) =>
    [s.name, s.contact_number, s.student_code, s.email]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(search.toLowerCase())),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff-students"] });

  const saveMutation = useMutation({
    mutationFn: (values: StudentForm) =>
      save({
        data: {
          ...(values.id ? { id: values.id } : {}),
          name: values.name,
          contact_number: values.contact_number,
          student_code: values.student_code || null,
          email: values.email || null,
        },
      }),
    onSuccess: () => {
      toast.success("শিক্ষার্থী সংরক্ষণ করা হয়েছে।");
      setForm(null);
      void invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "এই শিক্ষার্থীকে সংরক্ষণ করা যায়নি।"),
  });

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const result = await preview({ data: { text } });
      setCsvText(text);
      setAnalysis(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "আপলোড ব্যর্থ হয়েছে। ফাইলটি যাচাই করুন।");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function confirmImport(updateExisting: boolean) {
    if (!csvText) return;
    setBusy(true);
    try {
      const result = await doImport({ data: { text: csvText, updateExisting } });
      toast.success(
        `${bn(result.inserted)} জন যোগ হয়েছে, ${bn(result.updated)} জন আপডেট হয়েছে, ${bn(result.skipped)} জন বাদ দেওয়া হয়েছে।`,
      );
      setCsvText(null);
      setAnalysis(null);
      void invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ইম্পোর্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    try {
      const csv = await exportCsv();
      downloadCsv(`hsc28-students-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "এক্সপোর্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।");
    }
  }

  return (
    <div>
      <PageHeader
        title="শিক্ষার্থী ডেটাবেজ"
        description={`${bn(data?.length ?? 0)} জন নিবন্ধিত শিক্ষার্থী তাদের কন্টাক্ট নম্বর দিয়ে সাইন ইন করতে পারবে।`}
        action={
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}>
              <Upload className="size-4" />
              CSV আপলোড করুন
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="size-4" />
              CSV এক্সপোর্ট করুন
            </Button>
            <Button onClick={() => setForm({ ...emptyForm })}>
              <UserPlus className="size-4" />
              শিক্ষার্থী যোগ করুন
            </Button>
          </div>
        }
      />

      {analysis ? (
        <div className="card-panel mb-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold">CSV প্রিভিউ</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {bn(analysis.detected)}টি সারি পাওয়া গেছে · {bn(analysis.validCount)}টি নতুন ·{" "}
                {bn(analysis.duplicateCount)}টি ডুপ্লিকেট · {bn(analysis.invalidCount)}টি অবৈধ
              </p>
              {analysis.unmappedHeaders.length ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  বাদ দেওয়া কলাম: {analysis.unmappedHeaders.join(", ")}
                </p>
              ) : null}
            </div>
            <button
              onClick={() => {
                setAnalysis(null);
                setCsvText(null);
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="ইম্পোর্ট বাতিল করুন"
            >
              <X className="size-5" />
            </button>
          </div>
          {analysis.sample.length ? (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {analysis.sample.map((row, index) => (
                <li key={`${row.contact_number}-${index}`}>
                  {row.name} · {row.contact_number}
                  {row.student_code ? ` · ${row.student_code}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => confirmImport(false)}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              শুধু নতুনগুলো ইম্পোর্ট করুন
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || analysis.duplicateCount === 0}
              onClick={() => confirmImport(true)}
            >
              ইম্পোর্ট করুন ও ডুপ্লিকেট আপডেট করুন
            </Button>
          </div>
        </div>
      ) : null}

      <div className="card-panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম, কন্টাক্ট নম্বর বা আইডি দিয়ে শিক্ষার্থী খুঁজুন"
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length ? (
          <div className="sheet-scroll max-h-[65vh]">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="sticky top-0 bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">নাম</th>
                  <th className="px-3 py-2 text-left font-medium">কন্টাক্ট নম্বর</th>
                  <th className="px-3 py-2 text-left font-medium">শিক্ষার্থী আইডি</th>
                  <th className="px-3 py-2 text-left font-medium">ইমেইল</th>
                  <th className="px-3 py-2 text-left font-medium">যোগ হয়েছে</th>
                  <th className="px-3 py-2 text-right font-medium">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((student) => (
                  <tr key={student.id} className="transition-colors hover:bg-secondary/50">
                    <td className="px-3 py-2 font-medium">{student.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{bn(student.contact_number)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {student.student_code ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{student.email ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {formatDateShortBn(student.created_at)}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setForm({
                            id: student.id,
                            name: student.name,
                            contact_number: student.contact_number,
                            student_code: student.student_code ?? "",
                            email: student.email ?? "",
                          })
                        }
                      >
                        সম্পাদনা
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm(`${student.name}-কে ডেটাবেজ থেকে সরাতে চান?`)) return;
                          try {
                            await remove({ data: { id: student.id } });
                            toast.success("শিক্ষার্থী সরানো হয়েছে।");
                            void invalidate();
                          } catch (err) {
                            toast.error(
                              err instanceof Error ? err.message : "এই শিক্ষার্থীকে সরানো যায়নি।",
                            );
                          }
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="কোনো শিক্ষার্থী পাওয়া যায়নি।"
            description="CSV ফাইল আপলোড করুন অথবা নিজে শিক্ষার্থী যোগ করুন।"
          />
        )}
      </div>

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
          <div className="card-panel w-full max-w-md p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">
                {form.id ? "শিক্ষার্থী সম্পাদনা করুন" : "শিক্ষার্থী যোগ করুন"}
              </h2>
              <button
                onClick={() => setForm(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="বন্ধ করুন"
              >
                <X className="size-5" />
              </button>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(form);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="s-name">নাম *</Label>
                <Input
                  id="s-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-contact">কন্টাক্ট নম্বর *</Label>
                <Input
                  id="s-contact"
                  value={form.contact_number}
                  onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-code">শিক্ষার্থী আইডি</Label>
                <Input
                  id="s-code"
                  value={form.student_code}
                  onChange={(e) => setForm({ ...form, student_code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-email">ইমেইল</Label>
                <Input
                  id="s-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                  বাতিল
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  শিক্ষার্থী সংরক্ষণ করুন
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
