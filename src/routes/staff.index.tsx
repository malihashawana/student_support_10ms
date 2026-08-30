import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Inbox, Loader2, MessageSquareWarning, Users } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { staffOverview } from "@/lib/staff.functions";
import { STATUSES, bn, formatDateShortBn, labelCategory } from "@/lib/support-constants";

export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "সাপোর্ট ওভারভিউ — স্টুডেন্ট সাপোর্ট হাব HSC ২৮" },
      {
        name: "description",
        content: "HSC ২৮ শিক্ষার্থীদের সমস্যা, স্ট্যাটাস এবং সাপোর্ট টিমের কাজের লাইভ ওভারভিউ।",
      },
      { property: "og:title", content: "সাপোর্ট ওভারভিউ — স্টুডেন্ট সাপোর্ট হাব HSC ২৮" },
      { property: "og:description", content: "টিকেট সংখ্যা, স্ট্যাটাস এবং সাম্প্রতিক কার্যক্রম।" },
    ],
  }),
  component: StaffOverview,
});

function StaffOverview() {
  const fetchOverview = useServerFn(staffOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["staff-overview"],
    queryFn: () => fetchOverview(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="ওভারভিউ" description="HSC ২৮ শিক্ষার্থীদের রিপোর্ট করা সব কিছু।" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="মোট সমস্যা"
          value={bn(data?.total ?? 0)}
          icon={<Inbox className="size-5" />}
        />
        <StatCard
          label="আজ রিপোর্ট হয়েছে"
          value={bn(data?.today ?? 0)}
          tone="review"
          icon={<Clock className="size-5" />}
        />
        <StatCard
          label="উত্তরের অপেক্ষায়"
          value={bn(data?.awaitingResponse ?? 0)}
          tone="waiting"
          icon={<MessageSquareWarning className="size-5" />}
        />
        <StatCard
          label="নিবন্ধিত শিক্ষার্থী"
          value={bn(data?.students ?? 0)}
          icon={<Users className="size-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="card-panel">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">স্ট্যাটাস অনুযায়ী সমস্যা</h2>
          </div>
          <ul className="divide-y divide-border">
            {STATUSES.map((status) => (
              <li key={status} className="flex items-center justify-between px-4 py-3">
                <StatusBadge status={status} />
                <span className="font-display text-sm font-semibold">
                  {bn(data?.byStatus[status] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-panel">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">শীর্ষ বিভাগ</h2>
          </div>
          {data?.topCategories.length ? (
            <ul className="divide-y divide-border">
              {data.topCategories.map(([category, count]) => (
                <li key={category} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>{labelCategory(category)}</span>
                  <span className="font-display font-semibold">{bn(count)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              এখনো কোনো সমস্যা রিপোর্ট হয়নি।
            </p>
          )}
        </div>
      </div>

      <div className="card-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">সাম্প্রতিক কার্যক্রম</h2>
          <Link to="/staff/tickets" className="text-xs font-medium text-primary">
            ওয়ার্কস্পেস খুলুন
          </Link>
        </div>
        {data?.recent.length ? (
          <ul className="divide-y divide-border">
            {data.recent.map((ticket) => (
              <li key={ticket.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ticket.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.ticket_number} · {labelCategory(ticket.category)} ·{" "}
                    {formatDateShortBn(ticket.updated_at)}
                  </p>
                </div>
                <StatusBadge status={ticket.status} short />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-sm text-muted-foreground">এখনো কিছু রিপোর্ট হয়নি।</p>
        )}
      </div>
    </div>
  );
}
