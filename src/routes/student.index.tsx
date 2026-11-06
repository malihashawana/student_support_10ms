import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCircle2, FilePlus2, Inbox, Loader2, Sparkles, Ticket } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { UpcomingClasses } from "@/components/UpcomingClasses";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { studentDashboard } from "@/lib/student.functions";
import { bn, formatDateShortBn, labelCategory } from "@/lib/support-constants";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Student Support Hub HSC 27 & 28" },
      {
        name: "description",
        content: "Track your support tickets, notices and updates for HSC 27 and HSC 28.",
      },
      { property: "og:title", content: "Dashboard — Student Support Hub HSC 27 & 28" },
      { property: "og:description", content: "Student support tickets and notices for HSC 27 and 28." },
    ],
  }),
  component: StudentHome,
});

const DAY_MS = 24 * 60 * 60 * 1000;

function isRecent(dateStr: string) {
  return Date.now() - new Date(dateStr).getTime() < 3 * DAY_MS;
}

const CATEGORY_EN: Record<string, string> = {
  recorded_class: "Recorded Class",
  "recorded class": "Recorded Class",
  live_class: "Live Class",
  "live class": "Live Class",
  study_material: "Study Material",
  "study material": "Study Material",
  exam: "Exam",
  other: "Other",
  payment: "Payment",
  technical: "Technical Issue",
  account: "Account",
};

function categoryLabel(category: string, language: "bn" | "en") {
  const label = labelCategory(category);
  if (language === "bn") return label;
  const key = category.trim().toLowerCase().replace(/[-\s]+/g, "_");
  return CATEGORY_EN[key] ?? CATEGORY_EN[category.trim().toLowerCase()] ?? label;
}

function displayNumber(value: number, language: "bn" | "en") {
  return language === "bn" ? bn(value) : String(value);
}

function displayDate(date: string, language: "bn" | "en") {
  if (language === "bn") return formatDateShortBn(date);
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

function StudentHome() {
  const { language, t } = useLanguage();
  const fetchDashboard = useServerFn(studentDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("ড্যাশবোর্ড", "Dashboard")}
        description={t(
          "সমস্যা জানাও, টিকেট ফলো করো এবং আপডেট থাকো।",
          "Report an issue, track your tickets and stay updated.",
        )}
        action={
          <Button asChild>
            <Link to="/student/report">
              <FilePlus2 className="size-4" />
              {t("সমস্যা জানান", "Report an Issue")}
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16" role="status" aria-label={t("লোড হচ্ছে", "Loading")}>
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label={t("আমার চলমান সমস্যা", "My Open Tickets")}
              value={displayNumber(data?.stats.open ?? 0, language)}
              tone="open"
              icon={<Inbox className="size-5" />}
            />
            <StatCard
              label={t("আমার সমাধান হওয়া সমস্যা", "My Resolved Tickets")}
              value={displayNumber(data?.stats.resolved ?? 0, language)}
              tone="resolved"
              icon={<CheckCircle2 className="size-5" />}
            />
            <StatCard
              label={t("মোট জমা দেওয়া", "Total Submitted")}
              value={displayNumber(data?.stats.total ?? 0, language)}
              icon={<Ticket className="size-5" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="lg:order-1">
              <UpcomingClasses />
            </div>

            <div className="card-panel lg:order-3 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">{t("সাম্প্রতিক টিকেট", "Recent Tickets")}</h2>
                <Link to="/student/issues" className="text-xs font-medium text-primary">
                  {t("সব দেখুন", "View All")}
                </Link>
              </div>
              {data?.tickets.length ? (
                <ul className="divide-y divide-border">
                  {data.tickets.map((ticket) => (
                    <li key={ticket.id}>
                      <Link
                        to="/student/issues/$id"
                        params={{ id: ticket.id }}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {ticket.ticket_number} · {categoryLabel(ticket.category, language)} ·{" "}
                            {displayDate(ticket.created_at, language)}
                          </p>
                        </div>
                        <StatusBadge status={ticket.status} short />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<Inbox className="size-5" />}
                  title={t("এখনো কোনো সমস্যা জানানো হয়নি।", "No issues reported yet.")}
                  description={t(
                    "সমস্যা জানালে তার অবস্থাসহ এখানে দেখা যাবে।",
                    "Once you report an issue, you can track its status here.",
                  )}
                  action={
                    <Button asChild size="sm">
                      <Link to="/student/report">{t("সমস্যা জানান", "Report an Issue")}</Link>
                    </Button>
                  }
                />
              )}
            </div>

            <div className="card-panel overflow-hidden lg:order-2">
              <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bell className="size-3.5" />
                  </span>
                  {t("নোটিশ বোর্ড", "Notice Board")}
                </h2>
                <Link to="/student/notices" className="text-xs font-medium text-primary">
                  {t("সব নোটিশ", "All Notices")}
                </Link>
              </div>
              {data?.notices.length ? (
                <ul className="divide-y divide-border">
                  {data.notices.map((notice, index) => {
                    const recent = isRecent(notice.created_at);
                    const key = (notice.priority ?? "").toLowerCase();
                    const isImportant = key === "important" || key === "high";
                    const isUrgent = key === "urgent";
                    return (
                      <li
                        key={notice.id}
                        className={
                          isUrgent
                            ? "border-l-4 border-red-800 bg-red-600 px-4 py-3 text-white"
                            : isImportant
                              ? "border-l-4 border-amber-600 bg-amber-400 px-4 py-3 text-amber-950"
                              : index === 0 && recent
                                ? "bg-primary/5 px-4 py-3"
                                : "px-4 py-3"
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold">{notice.title}</p>
                            {recent ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                                <Sparkles className="size-2.5" />
                                {t("নতুন", "New")}
                              </span>
                            ) : null}
                          </div>
                          <PriorityBadge priority={notice.priority} />
                        </div>
                        <p
                          className={`mt-1 line-clamp-2 text-xs ${
                            isImportant || isUrgent ? "opacity-90" : "text-muted-foreground"
                          }`}
                        >
                          {notice.content}
                        </p>
                        <p
                          className={`mt-1 text-xs ${
                            isImportant || isUrgent ? "opacity-75" : "text-muted-foreground/70"
                          }`}
                        >
                          {displayDate(notice.created_at, language)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState title={t("নতুন কোনো নোটিশ নেই।", "No new notices.")} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
