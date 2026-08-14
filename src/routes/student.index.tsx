import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCircle2, FilePlus2, Inbox, Loader2, Search, Ticket } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { bn, formatDateShortBn, labelCategory } from "@/lib/support-constants";
import { studentDashboard } from "@/lib/student.functions";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "ড্যাশবোর্ড — Student Support Hub HSC 28" },
      {
        name: "description",
        content: "তোমার জানানো সমস্যা, নোটিশ দেখো এবং নতুন সমস্যা জানাও HSC 28-এর জন্য।",
      },
      { property: "og:title", content: "ড্যাশবোর্ড — Student Support Hub HSC 28" },
      { property: "og:description", content: "তোমার HSC 28 সাপোর্ট টিকেট ও নোটিশ।" },
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
        title="ড্যাশবোর্ড"
        description="সমস্যা জানাও, টিকেট ফলো করো এবং আপডেট থাকো।"
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/student/community">
                <Search className="size-4" />
                সমস্যা খুঁজুন
              </Link>
            </Button>
            <Button asChild>
              <Link to="/student/report">
                <FilePlus2 className="size-4" />
                সমস্যা জানান
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
              label="আমার চলমান সমস্যা"
              value={bn(data?.stats.open ?? 0)}
              tone="open"
              icon={<Inbox className="size-5" />}
            />
            <StatCard
              label="আমার সমাধান হওয়া সমস্যা"
              value={bn(data?.stats.resolved ?? 0)}
              tone="resolved"
              icon={<CheckCircle2 className="size-5" />}
            />
            <StatCard
              label="মোট জমা দেওয়া"
              value={bn(data?.stats.total ?? 0)}
              icon={<Ticket className="size-5" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="card-panel">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">সাম্প্রতিক টিকেট</h2>
                <Link to="/student/issues" className="text-xs font-medium text-primary">
                  সব দেখুন
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
                            {bn(ticket.ticket_number)} · {labelCategory(ticket.category)} ·{" "}
                            {formatDateShortBn(ticket.created_at)}
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
                  title="এখনো কোনো সমস্যা জানানো হয়নি।"
                  description="সমস্যা জানালে তার অবস্থাসহ এখানে দেখা যাবে।"
                  action={
                    <Button asChild size="sm">
                      <Link to="/student/report">সমস্যা জানান</Link>
                    </Button>
                  }
                />
              )}
            </div>

            <div className="card-panel">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Bell className="size-4 text-primary" />
                  নোটিশ বোর্ড
                </h2>
                <Link to="/student/notices" className="text-xs font-medium text-primary">
                  সব নোটিশ
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
                        {formatDateShortBn(notice.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="নতুন কোনো নোটিশ নেই।" />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
