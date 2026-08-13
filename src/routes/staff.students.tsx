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
import { downloadCsv, formatDateShort } from "@/lib/support-constants";

export const Route = createFileRoute("/staff/students")({
  head: () => ({
    meta: [
      { title: "Student Database — Student Support Hub HSC 28" },
      {
        name: "description",
        content:
          "Upload, edit and export the registered HSC 28 student list used for contact-number login.",
      },
      { property: "og:title", content: "Student Database — Student Support Hub HSC 28" },
      { property: "og:description", content: "Manage registered students and CSV imports." },
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
      toast.success("Student saved.");
      setForm(null);
      void invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "We couldn't save this student."),
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
      toast.error(err instanceof Error ? err.message : "Upload failed. Please check the file.");
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
        `${result.inserted} students added, ${result.updated} updated, ${result.skipped} skipped.`,
      );
      setCsvText(null);
      setAnalysis(null);
      void invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    try {
      const csv = await exportCsv();
      downloadCsv(`hsc28-students-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed. Please try again.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Student Database"
        description={`${data?.length ?? 0} registered students can sign in with their contact number.`}
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
              Upload CSV
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button onClick={() => setForm({ ...emptyForm })}>
              <UserPlus className="size-4" />
              Add student
            </Button>
          </div>
        }
      />

      {analysis ? (
        <div className="card-panel mb-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold">CSV preview</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {analysis.detected} rows detected · {analysis.validCount} new ·{" "}
                {analysis.duplicateCount} duplicates · {analysis.invalidCount} invalid
              </p>
              {analysis.unmappedHeaders.length ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Ignored columns: {analysis.unmappedHeaders.join(", ")}
                </p>
              ) : null}
            </div>
            <button
              onClick={() => {
                setAnalysis(null);
                setCsvText(null);
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cancel import"
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
              Import new only
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || analysis.duplicateCount === 0}
              onClick={() => confirmImport(true)}
            >
              Import and update duplicates
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
            placeholder="Search students by name, contact or ID"
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
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Contact number</th>
                  <th className="px-3 py-2 text-left font-medium">Student ID</th>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-left font-medium">Added</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((student) => (
                  <tr key={student.id} className="transition-colors hover:bg-secondary/50">
                    <td className="px-3 py-2 font-medium">{student.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{student.contact_number}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {student.student_code ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{student.email ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {formatDateShort(student.created_at)}
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
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm(`Remove ${student.name} from the database?`)) return;
                          try {
                            await remove({ data: { id: student.id } });
                            toast.success("Student removed.");
                            void invalidate();
                          } catch (err) {
                            toast.error(
                              err instanceof Error ? err.message : "We couldn't remove this student.",
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
            title="No students found."
            description="Upload a CSV file or add students manually."
          />
        )}
      </div>

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
          <div className="card-panel w-full max-w-md p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">
                {form.id ? "Edit student" : "Add student"}
              </h2>
              <button
                onClick={() => setForm(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
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
                <Label htmlFor="s-name">Name *</Label>
                <Input
                  id="s-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-contact">Contact number *</Label>
                <Input
                  id="s-contact"
                  value={form.contact_number}
                  onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-code">Student ID</Label>
                <Input
                  id="s-code"
                  value={form.student_code}
                  onChange={(e) => setForm({ ...form, student_code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-email">Email</Label>
                <Input
                  id="s-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save student
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
