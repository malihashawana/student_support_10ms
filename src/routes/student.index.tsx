import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCircle2, FilePlus2, Inbox, Loader2, Search, Ticket } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { formatDateShort } from "@/lib/support-constants";
import { studentDashboard } from "@/lib/student.functions";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — Student Support Hub HSC 28" },
      {
        name: "description",
        content: "Track your reported problems, read notices and report new issues for HSC 28.",
      },
      { property: "og:title", content: "Student Dashboard — Student Support Hub HSC 28" },
      { property: "og:description", content: "Your HSC 28 support tickets and notices." },
    ],
  }),
  component: StudentHome,
});

function StudentHome() {
  const fetchDashboard = useServerFn(studentDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Report a problem, follow your tickets and stay updated."
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/student/community">
                <Search className="size-4" />
                Search issues
              </Link>
            </Button>
            <Button asChild>
              <Link to="/student/report">
                <FilePlus2 className="size-4" />
                Report a Problem
              </Link>
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="My open issues"
              value={data?.stats.open ?? 0}
              tone="open"
              icon={<Inbox className="size-5" />}
            />
            <StatCard
              label="My resolved issues"
              value={data?.stats.resolved ?? 0}
              tone="resolved"
              icon={<CheckCircle2 className="size-5" />}
            />
            <StatCard
              label="Total submitted"
              value={data?.stats.total ?? 0}
              icon={<Ticket className="size-5" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="card-panel">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">Recent tickets</h2>
                <Link to="/student/issues" className="text-xs font-medium text-primary">
                  View all
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
                            {ticket.ticket_number} · {ticket.category} ·{" "}
                            {formatDateShort(ticket.created_at)}
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
                  title="No problems reported yet."
                  description="When you report a problem it will appear here with its status."
                  action={
                    <Button asChild size="sm">
                      <Link to="/student/report">Report a Problem</Link>
                    </Button>
                  }
                />
              )}
            </div>

            <div className="card-panel">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Bell className="size-4 text-primary" />
                  Notice board
                </h2>
                <Link to="/student/notices" className="text-xs font-medium text-primary">
                  All notices
                </Link>
              </div>
              {data?.notices.length ? (
                <ul className="divide-y divide-border">
                  {data.notices.map((notice) => (
                    <li key={notice.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{notice.title}</p>
                        <PriorityBadge priority={notice.priority} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {notice.content}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {formatDateShort(notice.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No new notices." />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
