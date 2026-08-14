import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { communityTickets } from "@/lib/student.functions";
import {
  CATEGORIES,
  STATUSES,
  bn,
  formatDateShortBn,
  labelCategory,
  labelCourse,
  labelStatus,
} from "@/lib/support-constants";

export const Route = createFileRoute("/student/community/")({
  head: () => ({
    meta: [
      { title: "সবার সমস্যা — স্টুডেন্ট সাপোর্ট হাব HSC 28" },
      {
        name: "description",
        content:
          "অন্য HSC 28 শিক্ষার্থীদের জানানো সমস্যাগুলো খুঁজে দেখো এবং অফিসিয়াল উত্তর পড়ো।",
      },
      { property: "og:title", content: "সবার সমস্যা — স্টুডেন্ট সাপোর্ট হাব HSC 28" },
      {
        property: "og:description",
        content: "সমস্যা জানানোর আগে দেখে নাও এটা আগে থেকে সমাধান হয়েছে কিনা।",
      },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const fetchCommunity = useServerFn(communityTickets);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["community", search, category, status],
    queryFn: () => fetchCommunity({ data: { search, category, status } }),
  });

  return (
    <div>
      <PageHeader
        title="সবার সমস্যা"
        description="অন্য শিক্ষার্থীদের জানানো সমস্যা। নাম ও যোগাযোগ নম্বর কখনো দেখানো হয় না।"
      />

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0 text-primary" />
        গোপনীয়তা সুরক্ষিত: শুধু সমস্যা, ধরন এবং অফিসিয়াল উত্তর দেখা যাবে।
      </div>

      <div className="card-panel mb-4 grid gap-3 p-4 sm:grid-cols-[1.6fr_1fr_1fr]">
        <div className="flex items-center gap-2 rounded-md border border-input px-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="কিওয়ার্ড, ধরন বা টিকিট আইডি দিয়ে খুঁজুন"
            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="সব ধরন" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব ধরন</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {labelCategory(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="সব অবস্থা" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব অবস্থা</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {labelStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((ticket) => (
            <li key={ticket.id}>
              <Link
                to="/student/community/$id"
                params={{ id: ticket.id }}
                className="card-panel block h-full p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-sm font-semibold">{ticket.title}</p>
                  <StatusBadge status={ticket.status} short />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {bn(ticket.ticket_number)} · {labelCategory(ticket.category)}
                  {ticket.course ? ` · ${labelCourse(ticket.course)}` : ""} ·{" "}
                  {formatDateShortBn(ticket.created_at)}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{ticket.description}</p>
                {ticket.official_response ? (
                  <p className="mt-2 line-clamp-2 rounded-md bg-primary/5 px-3 py-2 text-xs text-primary">
                    অফিসিয়াল উত্তর দেওয়া হয়েছে
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Search className="size-5" />}
          title="একই ধরনের কোনো সমস্যা পাওয়া যায়নি।"
          description="এখনো কেউ এটা জানায়নি — তুমিই প্রথম হয়ে এটা জানাতে পারো।"
        />
      )}
    </div>
  );
}
