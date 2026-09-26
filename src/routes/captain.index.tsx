import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Bell,
  FilePlus2,
  ListChecks,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { studentDashboard } from "@/lib/student.functions";
import { bn, formatDateShortBn, labelCategory } from "@/lib/support-constants";

export const Route = createFileRoute("/captain/")({
  head: () => ({
    meta: [{ title: "ক্যাপ্টেন ড্যাশবোর্ড — Student Support Hub HSC 28" }],
  }),
  component: CaptainDashboard,
});

function CaptainDashboard() {
  const { captain } = Route.useRouteContext();
  const fetchDashboard = useServerFn(studentDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["captain-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  return (
    <div>
      <PageHeader
        title={`স্বাগতম, ${captain.name}`}
        description="সব শিক্ষার্থীর সমস্যা দেখুন এবং প্রয়োজনীয়গুলো অনুমোদন করে সাপোর্ট টিমের কাছে অগ্রাধিকার পাঠান।"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/student/community">
                <Users className="size-4" />
                সবার সমস্যা দেখুন
              </Link>
            </Button>
            <Button asChild>
              <Link to="/student/report">
                <FilePlus2 className="size-4" />
                নতুন সমস্যা জানান
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-sm">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <p className="text-sm text-foreground">
          আপনি এই ব্যাচের <span className="font-semibold">ক্যাপ্টেন</span> হিসেবে নিয়োগ পেয়েছেন।
          এখন থেকে আপনি সব শিক্ষার্থীর জানানো সমস্যা দেখতে পারবেন এবং প্রয়োজনীয় সমস্যাগুলো{" "}
          <span className="font-semibold">অনুমোদন (Approve)</span> করে সরাসরি সাপোর্ট টিমের কাছে
          অগ্রাধিকার হিসেবে পাঠাতে পারবেন। কোন সমস্যা আপনি অনুমোদন করেছেন তা সবাই দেখতে পাবে।
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="খোলা সমস্যা"
              value={bn(data?.stats.open ?? 0)}
              tone="open"
              icon={<AlertTriangle className="size-5" />}
            />
            <StatCard
              label="সমাধান হয়েছে"
              value={bn(data?.stats.resolved ?? 0)}
              tone="resolved"
              icon={<ListChecks className="size-5" />}
            />
            <StatCard
              label="মোট সমস্যা"
              value={bn(data?.stats.total ?? 0)}
              icon={<Bell className="size-5" />}
            />
          </div>

          <div className="card-panel overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-display text-sm font-semibold">আপনার সাম্প্রতিক সমস্যা</h2>
            </div>
            {data?.tickets.length ? (
              <ul className="divide-y divide-border">
                {data.tickets.map((ticket) => (
                  <li
                    key={ticket.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.ticket_number} · {labelCategory(ticket.category)} ·{" "}
                        {formatDateShortBn(ticket.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="এখনো কোনো সমস্যা জানানো হয়নি।"
                description="উপরের বাটনে ক্লিক করে আপনার প্রথম সমস্যাটি জানান।"
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}