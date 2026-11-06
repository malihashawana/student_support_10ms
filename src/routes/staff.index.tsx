import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Inbox, Loader2, MessageSquareWarning, Users } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/language-context";
import { staffOverview } from "@/lib/staff.functions";
import { STATUSES, bn, formatDateShortBn, labelCategory } from "@/lib/support-constants";

export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "Support Overview — Student Support Hub HSC 27 & 28" },
      {
        name: "description",
        content: "Support dashboard for HSC 27 and 28 students: tickets, statuses and team activity.",
      },
      { property: "og:title", content: "Support Overview — Student Support Hub" },
      {
        property: "og:description",
        content: "Ticket counts, statuses and recent support activity.",
      },
    ],
  }),
  component: StaffOverview,
});

// Translate known categories without changing the stored category values.
// Unknown categories are shown as-is rather than given an incorrect translation.
const EN_CATEGORY_LABELS: Record<string, string> = {
  "Recorded Class": "Recorded Class",
  "Live Class": "Live Class",
  "Study Material": "Study Material",
  "Other": "Other",
  "Exam": "Exam",
  "রেকর্ডেড ক্লাস": "Recorded Class",
  "লাইভ ক্লাস": "Live Class",
  "স্টাডি ম্যাটেরিয়াল": "Study Material",
  "স্টাডি ম্যাটেরিয়াল": "Study Material",
  "অন্যান্য": "Other",
  "পরীক্ষা": "Exam",
};

function StaffOverview() {
  const { language, t } = useLanguage();
  const fetchOverview = useServerFn(staffOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["staff-overview"],
    queryFn: () => fetchOverview(),
  });

  const formatCount = (value: number) => (language === "bn" ? bn(value) : String(value));
  const categoryLabel = (category: string) => {
    const label = labelCategory(category);
    if (language === "bn") return label;
    return EN_CATEGORY_LABELS[label] ?? EN_CATEGORY_LABELS[category] ?? label;
  };
  const formatDate = (value: string) => {
    if (language === "bn") return formatDateShortBn(value);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20" role="status" aria-label={t("লোড হচ্ছে", "Loading")}>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("ওভারভিউ", "Overview")}
        description={t(
          "এইচএসসি ২৭ ও ২৮ শিক্ষার্থীদের রিপোর্ট করা সমস্যার সারসংক্ষেপ।",
          "Overview of issues reported by HSC 27 and 28 students.",
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("মোট সমস্যা", "Total Tickets")}
          value={formatCount(data?.total ?? 0)}
          icon={<Inbox className="size-5" />}
        />
        <StatCard
          label={t("আজ রিপোর্ট হয়েছে", "Reported Today")}
          value={formatCount(data?.today ?? 0)}
          tone="review"
          icon={<Clock className="size-5" />}
        />
        <StatCard
          label={t("উত্তরের অপেক্ষায়", "Awaiting Response")}
          value={formatCount(data?.awaitingResponse ?? 0)}
          tone="waiting"
          icon={<MessageSquareWarning className="size-5" />}
        />
        <StatCard
          label={t("নিবন্ধিত শিক্ষার্থী", "Registered Students")}
          value={formatCount(data?.students ?? 0)}
          icon={<Users className="size-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="card-panel">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">{t("স্ট্যাটাস অনুযায়ী সমস্যা", "Tickets by Status")}</h2>
          </div>
          <ul className="divide-y divide-border">
            {STATUSES.map((status) => (
              <li key={status} className="flex items-center justify-between px-4 py-3">
                <StatusBadge status={status} />
                <span className="font-display text-sm font-semibold">
                  {formatCount(data?.byStatus[status] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-panel">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">{t("শীর্ষ বিভাগ", "Top Categories")}</h2>
          </div>
          {data?.topCategories.length ? (
            <ul className="divide-y divide-border">
              {data.topCategories.map(([category, count]) => (
                <li key={category} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>{categoryLabel(category)}</span>
                  <span className="font-display font-semibold">{formatCount(count)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t("এখনো কোনো সমস্যা রিপোর্ট হয়নি।", "No tickets have been reported yet.")}
            </p>
          )}
        </div>
      </div>

      <div className="card-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{t("সাম্প্রতিক কার্যক্রম", "Recent Activity")}</h2>
          <Link to="/staff/tickets" className="text-xs font-medium text-primary">
            {t("Open Workspace", "Open Workspace")}
          </Link>
        </div>
        {data?.recent.length ? (
          <ul className="divide-y divide-border">
            {data.recent.map((ticket) => (
              <li key={ticket.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  {/* Student-entered ticket titles remain in their original language. */}
                  <p className="truncate text-sm font-medium">{ticket.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.ticket_number} · {categoryLabel(ticket.category)} ·{" "}
                    {formatDate(ticket.updated_at)}
                  </p>
                </div>
                <StatusBadge status={ticket.status} short />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {t("এখনো কিছু রিপোর্ট হয়নি।", "No recent activity yet.")}
          </p>
        )}
      </div>
    </div>
  );
}
