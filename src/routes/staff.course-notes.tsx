import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { moderateCourseNote, pendingCourseNotes } from "@/lib/staff.functions";

export const Route = createFileRoute("/staff/course-notes")({
  head: () => ({
    meta: [{ title: "কোর্স নোট অনুমোদন — সাপোর্ট টিম" }],
  }),
  component: StaffCourseNotesPage,
});

function StaffCourseNotesPage() {
  const queryClient = useQueryClient();
  const fetchPending = useServerFn(pendingCourseNotes);
  const moderate = useServerFn(moderateCourseNote);

  const { data, isLoading } = useQuery({
    queryKey: ["pending-course-notes"],
    queryFn: () => fetchPending(),
  });

  const act = useMutation({
    mutationFn: (input: { id: string; approve: boolean }) => moderate({ data: input }),
    onSuccess: (_res, vars) => {
      toast.success(vars.approve ? "নোটটি অনুমোদন করা হয়েছে।" : "নোটটি বাতিল করা হয়েছে।");
      queryClient.invalidateQueries({ queryKey: ["pending-course-notes"] });
    },
    onError: () => toast.error("কাজটি করা যায়নি। আবার চেষ্টা করুন।"),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="কোর্স নোট অনুমোদন"
        description="ক্যাপ্টেনদের পাঠানো নোট/ফাইল এখানে দেখে অনুমোদন বা বাতিল করুন।"
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.length ? (
        <div className="space-y-3">
          {data.map((note) => (
            <div key={note.id} className="card-panel space-y-3 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {note.tenms_courses?.name_bn ?? note.tenms_courses?.name_en} ·{" "}
                  {note.students?.name} ({note.students?.login_number})
                </span>
                <span>{new Date(note.created_at).toLocaleString("bn-BD")}</span>
              </div>

              {note.file_url ? (
                note.file_type?.startsWith("image/") ? (
                  <a href={note.file_url} target="_blank" rel="noreferrer">
                    <img
                      src={note.file_url}
                      alt={note.file_name ?? "note"}
                      className="max-h-64 w-full rounded-md border border-border object-contain"
                    />
                  </a>
                ) : (
                  <a
                    href={note.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm"
                  >
                    <FileText className="size-4" />
                    {note.file_name ?? "ফাইল দেখুন"}
                  </a>
                )
              ) : null}

              {note.content ? <p className="text-sm text-foreground">{note.content}</p> : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => act.mutate({ id: note.id, approve: false })}
                  disabled={act.isPending}
                  className="flex items-center gap-1 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <X className="size-3.5" />
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={() => act.mutate({ id: note.id, approve: true })}
                  disabled={act.isPending}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
                >
                  <Check className="size-3.5" />
                  অনুমোদন
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="অনুমোদনের অপেক্ষায় কোনো নোট নেই।" />
      )}
    </div>
  );
}