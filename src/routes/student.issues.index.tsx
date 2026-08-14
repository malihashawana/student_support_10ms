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
import { bn, formatDateShortBn, labelCategory } from "@/lib/support-constants";
import { myTickets } from "@/lib/student.functions";

export const Route = createFileRoute("/student/issues/")({
  head: () => ({
    meta: [
      { title: "আমার সমস্যা — Student Support Hub HSC 28" },
      {
        name: "description",
        content: "তুমি যেসব সমস্যা জানিয়েছ, সেগুলোর বর্তমান অবস্থা ও সর্বশেষ আপডেট।",
      },
      { property: "og:title", content: "আমার সমস্যা — Student Support Hub HSC 28" },
      { property: "og:description", content: "তোমার HSC 28 সাপোর্ট টিকেটের অবস্থা দেখো।" },
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
        title="আমার সমস্যা"
        description="শুধু তুমিই এই টিকেট ও এর বিস্তারিত দেখতে পাবে।"
        action={
          <Button asChild>
            <Link to="/student/report">
              <FilePlus2 className="size-4" />
              সমস্যা জানান
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
            placeholder="আমার টিকেট খুঁজুন"
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
                  <th className="px-4 py-2 text-left font-medium">টিকেট আইডি</th>
                  <th className="px-4 py-2 text-left font-medium">সমস্যা</th>
                  <th className="px-4 py-2 text-left font-medium">ধরন</th>
                  <th className="px-4 py-2 text-left font-medium">তারিখ</th>
                  <th className="px-4 py-2 text-left font-medium">অবস্থা</th>
                  <th className="px-4 py-2 text-left font-medium">সর্বশেষ আপডেট</th>
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
                        {bn(ticket.ticket_number)}
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
                      {labelCategory(ticket.category)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateShortBn(ticket.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.status} short />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateShortBn(ticket.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title={search ? "তোমার খোঁজার সাথে মিলে এমন কোনো সমস্যা পাওয়া যায়নি।" : "এখনো কোনো সমস্যা জানানো হয়নি।"}
            description={
              search ? "অন্য কোনো শব্দ দিয়ে চেষ্টা করো।" : "সমস্যা জানাও এবং এখানে এর অবস্থা দেখো।"
            }
          />
        )}
      </div>
    </div>
  );
}
