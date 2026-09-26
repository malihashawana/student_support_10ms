import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Heart, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { moderateCourseNote, pendingCourseNotes } from "@/lib/staff.functions";
import { formatDateBn } from "@/lib/support-constants";

export const Route = createFileRoute("/staff/course-notes")({
  head: () => ({
    meta: [{ title: "কোর্স নোট অনুমোদন — Student Support Hub HSC 28" }],
  }),
  component: CourseNoteModeration,
});

function CourseNoteModeration() {
  const fetchPending = useServerFn(pendingCourseNotes);
  const moderate = useServerFn(moderateCourseNote);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["pending-course-notes"],
    queryFn: () => fetchPending(),
  });

  const mutation = useMutation({
    mutationFn: (input: { id: string; approve: boolean }) => moderate({ data: input }),
    onSuccess: (_result, variables) => {
      toast.success(variables.approve ? "নোট অনুমোদন করা হয়েছে।" : "নোট প্রত্যাখ্যান করা হয়েছে।");
      void queryClient.invalidateQueries({ queryKey: ["pending-course-notes"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "কাজটি সম্পন্ন করা যায়নি।"),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="কোর্স নোট অনুমোদন"
        description="ক্যাপ্টেনদের জমা দেওয়া নোট এখানে অনুমোদন বা প্রত্যাখ্যান করুন — অনুমোদিত নোটই শিক্ষার্থীরা দেখতে পাবে।"
      />
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.length ? (
        <ul className="space-y-3">
          {data.map((note) => (
            <li key={note.id} className="card-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {note.tenms_courses?.name_bn ?? note.tenms_courses?.name_en ?? "কোর্স"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {note.students?.name ?? "ক্যাপ্টেন"} · {formatDateBn(note.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ id: note.id, approve: false })}
                  >
                    <X className="size-4" />
                    প্রত্যাখ্যান
                  </Button>
                  <Button
                    size="sm"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ id: note.id, approve: true })}
                  >
                    <Check className="size-4" />
                    অনুমোদন
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap text-foreground/85">{note.content}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Heart className="size-5" />} title="অনুমোদনের অপেক্ষায় কোনো নোট নেই।" />
      )}
    </div>
  );
}