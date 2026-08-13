import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FilePlus2, Inbox, Loader2, Search } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateShort } from "@/lib/support-constants";
import { myTickets } from "@/lib/student.functions";

export const Route = createFileRoute("/student/issues/")({
  head: () => ({
    meta: [
      { title: "My Issues — Student Support Hub HSC 28" },
      {
        name: "description",
        content: "All the problems you reported, with current status and last update.",
      },
      { property: "og:title", content: "My Issues — Student Support Hub HSC 28" },
      { property: "og:description", content: "Track the status of your HSC 28 support tickets." },
    ],
  }),
  component: MyIssues,
});

function MyIssues() {
  const fetchTickets = useServerFn(myTickets);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => fetchTickets(),
  });

  const rows = (data ?? []).filter((t) =>
    [t.ticket_number, t.title, t.category, t.status]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="My Issues"
        description="Only you can see these tickets and their details."
        action={
          <Button asChild>
            <Link to="/student/report">
              <FilePlus2 className="size-4" />
              Report a Problem
            </Link>
          </Button>
        }
      />

      <div className="card-panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search my tickets"
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length ? (
          <div className="sheet-scroll">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-secondary/70 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Ticket ID</th>
                  <th className="px-4 py-2 text-left font-medium">Problem</th>
                  <th className="px-4 py-2 text-left font-medium">Category</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Last updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((ticket) => (
                  <tr key={ticket.id} className="transition-colors hover:bg-secondary/50">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      <Link
                        to="/student/issues/$id"
                        params={{ id: ticket.id }}
                        className="text-primary hover:underline"
                      >
                        {ticket.ticket_number}
                      </Link>
                    </td>
                    <td className="max-w-[320px] px-4 py-3">
                      <Link
                        to="/student/issues/$id"
                        params={{ id: ticket.id }}
                        className="line-clamp-1 hover:underline"
                      >
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {ticket.category}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateShort(ticket.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.status} short />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateShort(ticket.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title={search ? "No issues found matching your search." : "No problems reported yet."}
            description={
              search ? "Try a different keyword." : "Report a problem and track it right here."
            }
          />
        )}
      </div>
    </div>
  );
}
