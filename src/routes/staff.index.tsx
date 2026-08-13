import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Inbox, Loader2, MessageSquareWarning, Users } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { staffOverview } from "@/lib/staff.functions";
import { STATUSES, formatDateShort } from "@/lib/support-constants";

export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "Support Overview — Student Support Hub HSC 28" },
      {
        name: "description",
        content: "Live overview of HSC 28 student issues, statuses and workload for the support team.",
      },
      { property: "og:title", content: "Support Overview — Student Support Hub HSC 28" },
      { property: "og:description", content: "Ticket volume, statuses and recent activity." },
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
      <PageHeader title="Overview" description="Everything reported by HSC 28 students." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total issues" value={data?.total ?? 0} icon={<Inbox className="size-5" />} />
        <StatCard
          label="Reported today"
          value={data?.today ?? 0}
          tone="review"
          icon={<Clock className="size-5" />}
        />
        <StatCard
          label="Awaiting response"
          value={data?.awaitingResponse ?? 0}
          tone="waiting"
          icon={<MessageSquareWarning className="size-5" />}
        />
        <StatCard
          label="Registered students"
          value={data?.students ?? 0}
          icon={<Users className="size-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="card-panel">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Issues by status</h2>
          </div>
          <ul className="divide-y divide-border">
            {STATUSES.map((status) => (
              <li key={status} className="flex items-center justify-between px-4 py-3">
                <StatusBadge status={status} />
                <span className="font-display text-sm font-semibold">
                  {data?.byStatus[status] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-panel">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Top categories</h2>
          </div>
          {data?.topCategories.length ? (
            <ul className="divide-y divide-border">
              {data.topCategories.map(([category, count]) => (
                <li key={category} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>{category}</span>
                  <span className="font-display font-semibold">{count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">No issues reported yet.</p>
          )}
        </div>
      </div>

      <div className="card-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <Link to="/staff/tickets" className="text-xs font-medium text-primary">
            Open workspace
          </Link>
        </div>
        {data?.recent.length ? (
          <ul className="divide-y divide-border">
            {data.recent.map((ticket) => (
              <li key={ticket.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ticket.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.ticket_number} · {ticket.category} ·{" "}
                    {formatDateShort(ticket.updated_at)}
                  </p>
                </div>
                <StatusBadge status={ticket.status} short />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-sm text-muted-foreground">Nothing reported yet.</p>
        )}
      </div>
    </div>
  );
}
