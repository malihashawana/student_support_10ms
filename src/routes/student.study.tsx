import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Loader2,
  NotebookText,
  Play,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Trophy,
} from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { formatDateShortBn } from "@/lib/support-constants";
import {
  createStudyNote,
  createStudyTask,
  deleteStudyNote,
  deleteStudyTask,
  listStudyNotes,
  studyTasksByRange,
  toggleStudyTask,
  updateStudyNote,
  vocabQuizSet,
} from "@/lib/student.functions";

export const Route = createFileRoute("/student/study")({
  head: () => ({
    meta: [
      { title: "স্টাডি হেল্প — স্টুডেন্ট সাপোর্ট হাব HSC 28" },
      { name: "description", content: "পড়াশোনার রুটিন সাজাও, নোট রাখো আর মজার শব্দ খেলা খেলো।" },
    ],
  }),
  component: StudyHelpPage,
});

const WEEKDAY_LABELS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function StudyHelpPage() {
  const [tab, setTab] = useState<"routine" | "notes" | "game">("routine");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const fetchTasks = useServerFn(studyTasksByRange);
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["study-tasks", toISODate(weekStart), toISODate(weekEnd)],
    queryFn: () => fetchTasks({ data: { from: toISODate(weekStart), to: toISODate(weekEnd) } }),
  });

  const createFn = useServerFn(createStudyTask);
  const toggleFn = useServerFn(toggleStudyTask);
  const deleteFn = useServerFn(deleteStudyTask);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["study-tasks"] });

  const createMutation = useMutation({
    mutationFn: (input: { title: string; subject?: string; task_date: string }) =>
      createFn({ data: input }),
    onSuccess: () => {
      setTitle("");
      setSubject("");
      invalidate();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (input: { id: string; is_done: boolean }) => toggleFn({ data: input }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (input: { id: string }) => deleteFn({ data: input }),
    onSuccess: invalidate,
  });

  const tasksByDate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof tasks>>();
    for (const day of weekDays) map.set(toISODate(day), []);
    for (const task of tasks ?? []) {
      const list = map.get(task.task_date) ?? [];
      list.push(task);
      map.set(task.task_date, list);
    }
    return map;
  }, [tasks, weekDays]);

  const selectedTasks = tasksByDate.get(selectedDate) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="স্টাডি হেল্প"
        description="পড়াশোনার রুটিন সাজাও, নোট রাখো আর মজার শব্দ খেলা খেলো।"
      />

      <div className="flex gap-2 rounded-xl bg-secondary/60 p-1">
        <button
          onClick={() => setTab("routine")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            tab === "routine" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
          }`}
        >
          <BookOpen className="size-4" />
          রুটিন
        </button>
        <button
          onClick={() => setTab("notes")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            tab === "notes" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
          }`}
        >
          <NotebookText className="size-4" />
          নোট
        </button>
        <button
          onClick={() => setTab("game")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            tab === "game" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Gamepad2 className="size-4" />
          শব্দ খেলা
        </button>
      </div>

      {tab === "routine" ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() - 7);
                setWeekStart(d);
              }}
              className="flex size-8 items-center justify-center rounded-full border border-border hover:bg-secondary"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-medium text-muted-foreground">
              {formatDateShortBn(toISODate(weekStart))} – {formatDateShortBn(toISODate(weekEnd))}
            </span>
            <button
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + 7);
                setWeekStart(d);
              }}
              className="flex size-8 items-center justify-center rounded-full border border-border hover:bg-secondary"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const iso = toISODate(day);
              const dayTasks = tasksByDate.get(iso) ?? [];
              const done = dayTasks.filter((t) => t.is_done).length;
              const total = dayTasks.length;
              const ratio = total ? done / total : 0;
              const isSelected = iso === selectedDate;
              const isToday = iso === toISODate(new Date());
              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDate(iso)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span className="text-[11px] text-muted-foreground">
                    {WEEKDAY_LABELS[day.getDay()]}
                  </span>
                  <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                    {day.getDate()}
                  </span>
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-[10px] font-medium ${
                      total === 0
                        ? "bg-secondary text-muted-foreground/50"
                        : ratio === 1
                          ? "bg-emerald-500 text-white"
                          : ratio > 0
                            ? "bg-amber-400 text-white"
                            : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {total ? `${done}/${total}` : "-"}
                  </span>
                </button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmedTitle = title.trim();
              const trimmedSubject = subject.trim();
              if (!trimmedTitle) return;
              createMutation.mutate({
                title: trimmedTitle,
                task_date: selectedDate,
                ...(trimmedSubject ? { subject: trimmedSubject } : {}),
              });
            }}
            className="card-panel flex flex-wrap items-center gap-2 p-3"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="কী পড়বে? যেমন: গণিত অধ্যায় ৩"
              className="min-w-[160px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="বিষয় (ঐচ্ছিক)"
              className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <Button type="submit" disabled={createMutation.isPending || !title.trim()}>
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              যোগ করো
            </Button>
          </form>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedTasks.length ? (
            <ul className="space-y-2">
              {selectedTasks.map((task) => (
                <li
                  key={task.id}
                  className={`group flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    task.is_done ? "border-emerald-200 bg-emerald-50" : "border-border bg-card"
                  }`}
                >
                  <button
                    onClick={() => toggleMutation.mutate({ id: task.id, is_done: !task.is_done })}
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      task.is_done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground/30 text-transparent hover:border-primary"
                    }`}
                  >
                    <Check className="size-3.5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        task.is_done ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.subject ? (
                      <p className="text-xs text-muted-foreground">{task.subject}</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate({ id: task.id })}
                    className="text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<BookOpen className="size-5" />}
              title="এই দিনে কোনো টাস্ক নেই।"
              description="ওপরে ফর্ম থেকে নতুন টাস্ক যোগ করো।"
            />
          )}
        </div>
      ) : null}

      {tab === "notes" ? <NotesTab /> : null}

      {tab === "game" ? <GameTab /> : null}
    </div>
  );
}

function NotesTab() {
  const fetchNotes = useServerFn(listStudyNotes);
  const queryClient = useQueryClient();
  const { data: notes, isLoading } = useQuery({
    queryKey: ["study-notes"],
    queryFn: () => fetchNotes(),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isNew, setIsNew] = useState(false);

  const createFn = useServerFn(createStudyNote);
  const updateFn = useServerFn(updateStudyNote);
  const deleteFn = useServerFn(deleteStudyNote);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["study-notes"] });

  const createMutation = useMutation({
    mutationFn: (input: { title: string; subject?: string; content: string }) =>
      createFn({ data: input }),
    onSuccess: (note) => {
      invalidate();
      setSelectedId(note.id);
      setIsNew(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; title: string; subject?: string; content: string }) =>
      updateFn({ data: input }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (input: { id: string }) => deleteFn({ data: input }),
    onSuccess: () => {
      invalidate();
      setSelectedId(null);
      setIsNew(false);
    },
  });

  const startNewNote = () => {
    setSelectedId(null);
    setIsNew(true);
    setTitle("");
    setSubject("");
    setContent("");
  };

  const selectNote = (note: NonNullable<typeof notes>[number]) => {
    setSelectedId(note.id);
    setIsNew(false);
    setTitle(note.title);
    setSubject(note.subject ?? "");
    setContent(note.content);
  };

  const isEditing = isNew || selectedId !== null;

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const trimmedSubject = subject.trim();
    if (selectedId) {
      updateMutation.mutate({
        id: selectedId,
        title: trimmedTitle,
        content,
        ...(trimmedSubject ? { subject: trimmedSubject } : {}),
      });
    } else {
      createMutation.mutate({
        title: trimmedTitle,
        content,
        ...(trimmedSubject ? { subject: trimmedSubject } : {}),
      });
    }
  };

  return (
    <div className="space-y-5">
      {isEditing ? (
        <div className="card-panel space-y-3 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="নোটের শিরোনাম"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium outline-none focus:border-primary"
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="বিষয় (ঐচ্ছিক) — যেমন: পদার্থবিজ্ঞান"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:w-64"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="এখানে তোমার নোট লেখো..."
            rows={8}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!title.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              সংরক্ষণ করো
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setSelectedId(null);
                setIsNew(false);
              }}
            >
              বাতিল
            </Button>
            {selectedId ? (
              <Button
                variant="ghost"
                type="button"
                className="ml-auto text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate({ id: selectedId })}
              >
                <Trash2 className="size-4" />
                মুছে ফেলো
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <Button onClick={startNewNote} className="w-full sm:w-auto">
          <Plus className="size-4" />
          নতুন নোট লেখো
        </Button>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : notes?.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {notes.map((note) => (
            <li key={note.id}>
              <button
                onClick={() => selectNote(note)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  selectedId === note.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{note.title}</p>
                  {note.subject ? (
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                      {note.subject}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {note.content || "(খালি নোট)"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  {formatDateShortBn(note.updated_at)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : !isEditing ? (
        <EmptyState
          icon={<NotebookText className="size-5" />}
          title="এখনো কোনো নোট লেখা হয়নি।"
          description="ওপরের বাটনে ক্লিক করে প্রথম নোট লেখো।"
        />
      ) : null}
    </div>
  );
}

function GameTab() {
  const fetchQuiz = useServerFn(vocabQuizSet);
    const [questions, setQuestions] = useState<
    { id: string; word: string; options: string[]; answer: string }[] | null
  >(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  const startGame = async () => {
    setIsLoading(true);
    setFinished(false);
    setScore(0);
    setIndex(0);
    setSelected(null);
    const data = await fetchQuiz();
    setQuestions(data);
    setIsLoading(false);
  };

  const current = questions?.[index];

  const handleAnswer = (option: string) => {
    if (selected) return;
    setSelected(option);
    if (current && option === current.answer) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (!questions) return;
    if (index + 1 >= questions.length) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
  };

  if (!questions) {
    return (
      <div className="card-panel flex flex-col items-center gap-4 p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Gamepad2 className="size-7" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">শব্দ খেলা</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ১০টা ইংরেজি শব্দের সঠিক অর্থ বেছে নাও, দেখো কত পয়েন্ট পাও!
          </p>
        </div>
        <Button onClick={startGame} disabled={isLoading}>
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          শুরু করো
        </Button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="card-panel flex flex-col items-center gap-4 p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
          <Trophy className="size-7" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">খেলা শেষ!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            তুমি {questions.length}টার মধ্যে {score}টা সঠিক উত্তর দিয়েছো।
          </p>
        </div>
        <Button onClick={startGame}>
          <RotateCcw className="size-4" />
          আবার খেলো
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          প্রশ্ন {index + 1}/{questions.length}
        </span>
        <span className="font-medium text-primary">স্কোর: {score}</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((index + (selected ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <div className="card-panel p-6 text-center">
        <p className="text-xs text-muted-foreground">এই শব্দের অর্থ কী?</p>
        <p className="mt-2 font-display text-2xl font-bold text-primary">{current?.word}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {current?.options.map((option) => {
          const isCorrect = option === current.answer;
          const isSelected = option === selected;
          const showResult = selected !== null;
          return (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={showResult}
              className={`rounded-xl border p-3 text-left text-sm font-medium transition-colors ${
                showResult && isCorrect
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : showResult && isSelected
                    ? "border-red-400 bg-red-50 text-red-600"
                    : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selected ? (
        <Button onClick={handleNext} className="w-full sm:w-auto">
          {index + 1 >= questions.length ? "ফলাফল দেখো" : "পরের প্রশ্ন"}
        </Button>
      ) : null}
    </div>
  );
}