import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Loader2 } from "lucide-react";

import { useLanguage } from "@/lib/language-context";
import { upcomingAll } from "@/lib/student.functions";

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

function dayLabel(date: string, language: "bn" | "en") {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(
    language === "bn" ? "bn-BD" : "en-US",
    { month: "short", day: "numeric", timeZone: "UTC" },
  );
}

export function UpcomingClasses() {
  const { language, t } = useLanguage();
  const fetchAll = useServerFn(upcomingAll);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["upcoming-all"],
    queryFn: () => fetchAll(),
    refetchInterval: 5 * 60 * 1000,
  });

  // The server already limits these classes to the student's HSC 28 department.
  // Do not expose a second client-side course selector.
  const items = data?.items ?? [];
  const days = data?.today ? nextDays(data.today, SHOW_DAYS) : [];

  return (
    <section className="card-panel space-y-4 p-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-primary" />
        <h2 className="font-display text-base font-semibold">
          {t("আসন্ন ক্লাস", "Upcoming Classes")}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4" role="status" aria-label={t("ক্লাস লোড হচ্ছে", "Loading classes")}>
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
          {t("ক্লাস রুটিন লোড করা যাচ্ছে না। পরে আবার চেষ্টা করুন।", "Unable to load the class schedule. Please try again later.")}
        </p>
      ) : (
        <div className="max-h-[32rem] space-y-4 overflow-y-auto pr-1">
          {days.map((date) => {
            const list = items.filter((i) => i.date === date);
            return (
              <div key={date} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  {dayLabel(date, language)}
                </p>
                {list.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
                    {t("ক্লাস নেই", "No classes")}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {list.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5"
                      >
                        <span className="w-16 shrink-0 text-center text-[11px] font-medium text-primary">
                          {c.time || "—"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">
                            {c.title || t("টপিক জানানো হবে", "Topic to be announced")}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {c.subject}
                          </p>
                        </div>
                        {c.link ? (
                          <a
                            href={c.link}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs text-primary-foreground"
                          >
                            {t("ক্লাসে যান", "Join Class")}
                          </a>
                        ) : null}
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
