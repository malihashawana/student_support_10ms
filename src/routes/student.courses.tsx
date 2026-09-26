import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookMarked, Heart, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import {
  courseNotesForCourse,
  createCourseNote,
  tenmsCourseStructure,
  toggleNoteLove,
} from "@/lib/student.functions";

export const Route = createFileRoute("/student/courses")({
  head: () => ({
    meta: [
      { title: "কোর্স স্ট্রাকচার — স্টুডেন্ট সাপোর্ট হাব HSC 28" },
      { name: "description", content: "HSC 28-এর সব বিষয় ও পেপারের তালিকা।" },
    ],
  }),
  component: CoursesPage,
});

const GROUP_STYLES: Record<string, string> = {
  আবশ্যিক: "border-sky-200 bg-sky-50 text-sky-700",
  বিজ্ঞান: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "ব্যবসায় শিক্ষা": "border-amber-200 bg-amber-50 text-amber-700",
  মানবিক: "border-violet-200 bg-violet-50 text-violet-700",
};

function CoursesPage() {
  const fetchStructure = useServerFn(tenmsCourseStructure);
  const { data, isLoading } = useQuery({
    queryKey: ["tenms-course-structure"],
    queryFn: () => fetchStructure(),
  });

  const [openCourseId, setOpenCourseId] = useState<number | null>(null);

  const groups = new Map<string, NonNullable<typeof data>>();
  for (const program of data ?? []) {
    const key = program.group_label ?? "অন্যান্য";
    const list = groups.get(key) ?? [];
    list.push(program);
    groups.set(key, list);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="কোর্স স্ট্রাকচার"
        description="একটি পেপারে ক্লিক করে নোট দেখুন, বা (ক্যাপ্টেন হলে) নতুন নোট যোগ করুন।"
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : groups.size ? (
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([group, programs]) => (
            <div key={group}>
              <h2 className="mb-3 font-display text-sm font-semibold text-muted-foreground">
                {group}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {programs.map((program) => (
                  <div key={program.id} className="card-panel p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`flex size-8 items-center justify-center rounded-lg border ${
                          GROUP_STYLES[group] ?? "border-border bg-secondary text-foreground"
                        }`}
                      >
                        <BookMarked className="size-4" />
                      </span>
                      <p className="font-display text-sm font-semibold">
                        {program.subject_name_bn}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {program.courses.map((course) => (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() =>
                            setOpenCourseId((prev) => (prev === course.id ? null : course.id))
                          }
                          className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                            openCourseId === course.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground/80 hover:bg-secondary/80"
                          }`}
                        >
                          {course.name_bn}
                        </button>
                      ))}
                    </div>

                    {program.courses.map((course) =>
                      openCourseId === course.id ? (
                        <CourseNotesPanel
                          key={course.id}
                          courseId={course.id}
                          courseName={course.name_bn}
                        />
                      ) : null,
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="কোর্সের তথ্য এখনো যোগ করা হয়নি।" />
      )}
    </div>
  );
}

function CourseNotesPanel({ courseId, courseName }: { courseId: number; courseName: string }) {
  const queryClient = useQueryClient();
  const fetchNotes = useServerFn(courseNotesForCourse);
  const submitNote = useServerFn(createCourseNote);
  const toggleLove = useServerFn(toggleNoteLove);
  const [draft, setDraft] = useState("");

  const queryKey = ["course-notes", courseId];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchNotes({ data: { courseId } }),
  });

  const addNote = useMutation({
    mutationFn: (content: string) => submitNote({ data: { courseId, content } }),
    onSuccess: () => {
      setDraft("");
      toast.success("নোট জমা দেওয়া হয়েছে, অনুমোদনের অপেক্ষায় আছে।");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "নোটটি দেওয়া যায়নি।"),
  });

  const loveNote = useMutation({
    mutationFn: (noteId: string) => toggleLove({ data: { noteId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <p className="text-xs font-semibold text-muted-foreground">{courseName} — নোট</p>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : data?.notes.length ? (
        <div className="space-y-2">
          {data.notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-border bg-background p-3">
              <p className="text-sm text-foreground">{note.content}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {note.authorName}
                  {note.status === "pending" ? " · অনুমোদনের অপেক্ষায়" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => loveNote.mutate(note.id)}
                  disabled={loveNote.isPending}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
                    note.lovedByMe ? "text-red-500" : "text-muted-foreground hover:text-red-400"
                  }`}
                >
                  <Heart className={`size-3.5 ${note.lovedByMe ? "fill-current" : ""}`} />
                  {note.loveCount}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">এখনো কোনো নোট নেই।</p>
      )}

      {data?.isCaptain ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim().length < 5) {
              toast.error("নোটটি অন্তত ৫ অক্ষরে লিখুন।");
              return;
            }
            addNote.mutate(draft.trim());
          }}
          className="flex items-start gap-2 pt-2"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="এই পেপারের জন্য নোট লিখুন..."
            rows={2}
            className="flex-1 rounded-lg border border-border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={addNote.isPending}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            {addNote.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground/70">
          শুধু ক্যাপ্টেনরা এখানে নতুন নোট যোগ করতে পারবেন।
        </p>
      )}
    </div>
  );
}