import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Loader2 } from "lucide-react";

import { upcomingAll } from "@/lib/student.functions";

const STORAGE_KEY = "upcoming-groups-v1";
const SHOW_DAYS = 3;

function nextDays(today: string, count: number) {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function dayLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function UpcomingClasses() {
  const [selected, setSelected] = useState<string[]>([]);
  const fetchAll = useServerFn(upcomingAll);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setSelected(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  const update = (next: string[]) => {
    setSelected(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["upcoming-all"],
    queryFn: () => fetchAll(),
    refetchInterval: 5 * 60 * 1000,
  });

  const groups = data?.groups ?? [];
  const today = data?.today ?? "";
  const active = selected.filter((s) => groups.includes(s));
  const all = data?.items ?? [];
  const items = active.length ? all.filter((i) => active.includes(i.group)) : all;
  const days = today ? nextDays(today, SHOW_DAYS) : [];

  return (
    <section className="card-panel space-y-4 p-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-primary" />
        <h2 className="font-display text-base font-semibold">আসন্ন ক্লাস</h2>
      </div>

      {groups.length ? (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            {active.length ? `${active.length}টি কোর্স বেছে নেওয়া আছে` : "সব কোর্সের ক্লাস দেখাচ্ছে — নিজের কোর্স বেছে নিন"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => update([])}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                active.length === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/80 hover:bg-secondary/70"
              }`}
            >
              সব
            </button>
            {groups.map((g) => {
              const on = active.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => update(on ? active.filter((x) => x !== g) : [...active, g])}
                  className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                    on ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/80 hover:bg-secondary/70"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="max-h-[32rem] space-y-4 overflow-y-auto pr-1">
          {days.map((date) => {
            const list = items.filter((i) => i.date === date);
            return (
              <div key={date} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{dayLabel(date)}</p>
                {list.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">ক্লাস নেই</p>
                ) : (
                  <ul className="space-y-1.5">
                    {list.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                        <span className="w-16 shrink-0 text-center text-[11px] font-medium text-primary">{c.time || "—"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">{c.title || "টপিক জানানো হবে"}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{c.subject}</p>
                        </div>
                        {c.link ? <a href={c.link} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs text-primary-foreground">ক্লাসে যান</a> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}