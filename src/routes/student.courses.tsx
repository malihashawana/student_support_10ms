import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookMarked, Loader2, X } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { courseSchedule } from "@/lib/student.functions";

export const Route = createFileRoute("/student/courses")({
  head: () => ({
    meta: [
      { title: "কোর্স স্ট্রাকচার — স্টুডেন্ট সাপোর্ট হাব" },
      { name: "description", content: "HSC 28 ব্যাচের বিভাগ অনুযায়ী আপলোড হওয়া ক্লাসের তালিকা।" },
    ],
  }),
  component: CoursesPage,
});

type UploadedClass = {
  id: string;
  date: string;
  chapter: string;
  title: string;
  link: string;
};

type OpenCourse = { name: string; classes: UploadedClass[] };

function CoursesPage() {
  const fetchSchedule = useServerFn(courseSchedule);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["course-schedule"],
    queryFn: () => fetchSchedule(),
  });
  const [open, setOpen] = useState<OpenCourse | null>(null);

  const groups = new Map<string, NonNullable<typeof data>["programs"]>();
  if (!data?.unavailableForBatch) {
    for (const program of data?.programs ?? []) {
      const key = program.groupLabel ?? "অন্যান্য";
      const list = groups.get(key) ?? [];
      list.push(program);
      groups.set(key, list);
    }
  }

  // The server function is the access-control boundary: it does not return
  // HSC 28 course data for HSC 27 students. This page also hides the view.
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader title="কোর্স স্ট্রাকচার" description="কোর্সের তথ্য লোড করা যাচ্ছে না।" />
        <div className="card-panel space-y-3 p-5 text-center">
          <p className="text-sm text-destructive">কোর্সের তথ্য লোড করা যায়নি।</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            আবার চেষ্টা করো
          </button>
        </div>
      </div>
    );
  }

  if (data?.unavailableForBatch) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader title="কোর্স স্ট্রাকচার" description="এই ফিচারটি শুধু HSC 28 অনলাইন ব্যাচের জন্য।" />
        <div className="card-panel space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">এই পেজটি তোমার ব্যাচের জন্য প্রযোজ্য নয়</h2>
          <p className="text-sm text-muted-foreground">
            কোর্স স্ট্রাকচার ও আপলোড হওয়া ক্লাসের তালিকা শুধু HSC 28 শিক্ষার্থীদের জন্য উপলব্ধ।
          </p>
          <Link
            to="/student"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            ড্যাশবোর্ডে যাও
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="কোর্স স্ট্রাকচার"
        description="তোমার বিভাগ অনুযায়ী পেপারে ট্যাপ করলে আপলোড হওয়া ক্লাসগুলো দেখতে পাবে।"
      />

      {data?.needsAcademicProfile ? (
        <div className="card-panel space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">প্রথমে একাডেমিক তথ্য সম্পূর্ণ করো</h2>
          <p className="text-sm text-muted-foreground">
            কোর্স দেখতে প্রোফাইল থেকে HSC ব্যাচ ও বিভাগ নির্বাচন করে সেভ করতে হবে।
          </p>
          <Link
            to="/student/profile"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            প্রোফাইলে যাও
          </Link>
        </div>
      ) : groups.size ? (
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([group, programs]) => (
            <div key={group}>
              <h2 className="mb-3 font-display text-sm font-semibold text-muted-foreground">{group}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {programs.map((program) => (
                  <div key={program.id} className="card-panel space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                        <BookMarked className="size-4" />
                      </span>
                      <p className="truncate font-display text-sm font-semibold">{program.subjectNameBn}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {program.courses.map((course) => {
                        const uploaded = course.classes.filter((c) => c.status === "uploaded");
                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => setOpen({ name: course.name_bn, classes: uploaded })}
                            className="rounded-full bg-secondary px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-primary hover:text-primary-foreground"
                          >
                            {course.name_bn}
                            {uploaded.length ? <span className="ml-1 opacity-60">· {uploaded.length}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="তোমার বিভাগের জন্য কোর্সের তথ্য এখনো যোগ করা হয়নি।" />
      )}

      {open ? <CourseModal course={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function CourseModal({ course, onClose }: { course: OpenCourse; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chapters = new Map<string, UploadedClass[]>();
  for (const item of course.classes) {
    const key = item.chapter || "অন্যান্য";
    const list = chapters.get(key) ?? [];
    list.push(item);
    chapters.set(key, list);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={course.name}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-semibold">{course.name}</p>
            <p className="text-xs text-muted-foreground">{course.classes.length}টা ক্লাস আপলোড হয়েছে</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করো"
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {course.classes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              এই কোর্সের ক্লাস শিগগিরই আপলোড হবে।
            </p>
          ) : (
            Array.from(chapters.entries()).map(([chapter, list]) => (
              <section key={chapter} className="space-y-2">
                <p className="text-sm font-semibold">{chapter}</p>
                <ul className="space-y-1.5">
                  {list.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5"
                    >
                      <p className="min-w-0 flex-1 text-sm font-medium">{item.title || "ক্লাস"}</p>
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground"
                        >
                          দেখো
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
