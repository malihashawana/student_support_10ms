import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookMarked, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { tenmsCourseStructure } from "@/lib/student.functions";

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
        description="HSC 28 ব্যাচের সব বিষয় ও পেপারের তালিকা — ক্লাস শুরু হলে এখানেই রুটিন ও লেকচার যোগ হবে।"
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
                        <span
                          key={course.id}
                          className="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground/80"
                        >
                          {course.name_bn}
                        </span>
                      ))}
                    </div>
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