import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import {
  addClass,
  deleteClass,
  setClassStatus,
  setProgramSlug,
  staffCourseBoard,
  syncTenmsCatalog,
} from "@/lib/staff.functions";

export const Route = createFileRoute("/staff/course-activity")({
  head: () => ({ meta: [{ title: "কোর্স অ্যাক্টিভিটি — সাপোর্ট টিম" }] }),
  component: StaffCourseActivityPage,
});

const STATUS_OPTIONS: [string, string][] = [
  ["uploaded", "আপলোড হয়েছে"],
  ["scheduled", "নির্ধারিত"],
  ["pending", "অপেক্ষমান"],
  ["missing", "মিসিং"],
];

const inputCls =
  "rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary";

const errMsg = (err: unknown) => (err instanceof Error ? err.message : "কাজটি করা যায়নি।");

function StaffCourseActivityPage() {
  const queryClient = useQueryClient();
  const fetchBoard = useServerFn(staffCourseBoard);
  const sync = useServerFn(syncTenmsCatalog);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-course-board"],
    queryFn: () => fetchBoard(),
  });

  const syncNow = useMutation({
    mutationFn: () => sync(),
    onSuccess: (res) => {
      if (res.failed.length) {
        toast.error(`সিঙ্ক হয়েছে ${res.synced}টা। ব্যর্থ: ${res.failed.join(", ")}`);
      } else {
        toast.success(`${res.synced}টা সাবজেক্টের তথ্য সিঙ্ক হয়েছে।`);
      }
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["staff-course-board"] });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="কোর্স অ্যাক্টিভিটি"
        description="প্রতিটা সাবজেক্টের 10ms স্লাগ বসান, লাইভ তথ্য সিঙ্ক করুন এবং ক্লাসের আপলোড স্ট্যাটাস আপডেট করুন।"
        action={
          <button
            type="button"
            onClick={() => syncNow.mutate()}
            disabled={syncNow.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {syncNow.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            10ms থেকে সিঙ্ক করুন
          </button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((program) => (
            <ProgramCard key={program.id} program={program} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

type Board = NonNullable<Awaited<ReturnType<typeof staffCourseBoard>>>;

function ProgramCard({ program, onChanged }: { program: Board[number]; onChanged: () => void }) {
  const saveSlug = useServerFn(setProgramSlug);
  const [slug, setSlug] = useState(program.slug ?? "");
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: () => saveSlug({ data: { programId: program.id, slug } }),
    onSuccess: () => {
      toast.success("স্লাগ সংরক্ষণ হয়েছে।");
      onChanged();
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  return (
    <div className="card-panel space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-sm font-semibold">{program.subjectNameBn}</p>
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs text-primary">
          {open ? "ক্লাস লুকান" : `ক্লাস ম্যানেজ (${program.courses.length}টা কোর্স)`}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="10ms স্লাগ, যেমন hsc-physics-online-batch"
          className={`${inputCls} flex-1`}
        />
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-lg border border-border px-3 text-xs hover:bg-secondary disabled:opacity-50"
        >
          সেভ
        </button>
      </div>

      {open
        ? program.courses.map((course) => (
            <CourseClasses key={course.id} course={course} onChanged={onChanged} />
          ))
        : null}
    </div>
  );
}

function CourseClasses({
  course,
  onChanged,
}: {
  course: Board[number]["courses"][number];
  onChanged: () => void;
}) {
  const add = useServerFn(addClass);
  const changeStatus = useServerFn(setClassStatus);
  const remove = useServerFn(deleteClass);
  const [classNo, setClassNo] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("uploaded");

  const addMut = useMutation({
    mutationFn: () =>
      add({
        data: {
          courseId: course.id,
          title,
          classNo: Number(classNo) || course.classes.length + 1,
          status,
        },
      }),
    onSuccess: () => {
      setTitle("");
      setClassNo("");
      onChanged();
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  const statusMut = useMutation({
    mutationFn: (input: { classId: string; status: string }) => changeStatus({ data: input }),
    onSuccess: onChanged,
    onError: (err) => toast.error(errMsg(err)),
  });

  const removeMut = useMutation({
    mutationFn: (classId: string) => remove({ data: { classId } }),
    onSuccess: onChanged,
    onError: (err) => toast.error(errMsg(err)),
  });

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-semibold text-muted-foreground">{course.name_bn}</p>

      {course.classes.map((cl) => (
        <div key={cl.id} className="flex items-center gap-2 text-sm">
          <span className="w-8 text-muted-foreground">#{cl.class_no}</span>
          <span className="flex-1 truncate">{cl.title}</span>
          <select
            value={cl.status}
            onChange={(e) => statusMut.mutate({ classId: cl.id, status: e.target.value })}
            className={inputCls}
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => removeMut.mutate(cl.id)} className="text-destructive">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-1">
        <input
          value={classNo}
          onChange={(e) => setClassNo(e.target.value)}
          placeholder="নং"
          className={`${inputCls} w-14`}
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ক্লাসের নাম"
          className={`${inputCls} min-w-40 flex-1`}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => addMut.mutate()}
          disabled={addMut.isPending || !title.trim()}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"
        >
          <Plus className="size-3.5" />
          যোগ
        </button>
      </div>
    </div>
  );
}