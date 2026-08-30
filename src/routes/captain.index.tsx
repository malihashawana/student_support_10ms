import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Bell, FilePlus2, ListChecks, Loader2, ShieldCheck } from "lucide-react";

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
        description="ক্যাপ্টেন হিসেবে আপনার জানানো সমস্যা সরাসরি অগ্রাধিকার (High Priority) হিসেবে সাপোর্ট টিমের কাছে যাবে।"
        action={
          <Button asChild>
            <Link to="/student/report">
              <FilePlus2 className="size-4" />
              প্রায়োরিটি সমস্যা জানান
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm text-foreground">
          আপনি এই ব্যাচের <span className="font-semibold">ক্যাপ্টেন</span> হিসেবে নিয়োগ পেয়েছেন।
          আপনার জানানো প্রতিটি সমস্যা স্বয়ংক্রিয়ভাবে গুরুত্বপূর্ণ (High) হিসেবে চিহ্নিত হয়ে
          সাপোর্ট টিমের কাছে অগ্রাধিকার পাবে। এখনো শুধু নিজের সমস্যাই দেখা ও পাঠানো যাবে।
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
              <h2 className="font-display text-sm font-semibold">সাম্প্রতিক সমস্যা</h2>
            </div>
            {data?.tickets.length ? (
              <ul className="divide-y divide-border">
                {data.tickets.map((ticket) => (
                  <li key={ticket.id} className="flex items-center justify-between gap-3 px-4 py-3">
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
                description="উপরের বাটনে ক্লিক করে আপনার প্রথম প্রায়োরিটি সমস্যাটি জানান।"
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
