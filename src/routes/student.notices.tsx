import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Loader2, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { PriorityBadge } from "@/components/StatusBadge";
import { publishedNotices } from "@/lib/student.functions";
import { formatDateBn } from "@/lib/support-constants";

export const Route = createFileRoute("/student/notices")({
  head: () => ({
    meta: [
      { title: "নোটিশ — স্টুডেন্ট সাপোর্ট হাব HSC 28" },
      {
        name: "description",
        content: "HSC 28 সাপোর্ট টিমের অফিসিয়াল ঘোষণা ও আপডেট।",
      },
      { property: "og:title", content: "নোটিশ — স্টুডেন্ট সাপোর্ট হাব HSC 28" },
      { property: "og:description", content: "শিক্ষার্থীদের জন্য HSC 28-এর সর্বশেষ ঘোষণা।" },
    ],
  }),
  component: NoticesPage,
});

const DAY_MS = 24 * 60 * 60 * 1000;

function isRecent(dateStr: string) {
  return Date.now() - new Date(dateStr).getTime() < 3 * DAY_MS;
}

function NoticesPage() {
  const fetchNotices = useServerFn(publishedNotices);
  const { data, isLoading } = useQuery({
    queryKey: ["student-notices"],
    queryFn: () => fetchNotices(),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="নোটিশ বোর্ড"
        description="সাপোর্ট টিমের সর্বশেষ ঘোষণা ও গুরুত্বপূর্ণ আপডেট এখানে দেখুন।"
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
            ) : data?.length ? (
        <ul className="space-y-4">
          {data.map((notice, index) => {
            const recent = isRecent(notice.created_at);
            const featured = index === 0;
            const key = (notice.priority ?? "").toLowerCase();
            const isImportant = key === "important" || key === "high";
            const isUrgent = key === "urgent";
            const boxClass = isUrgent
              ? "border-red-800 bg-red-600 text-white shadow-md"
              : isImportant
                ? "border-amber-600 bg-amber-400 text-amber-950 shadow-md"
                : featured
                  ? "border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-sm"
                  : "border-border bg-card";
            return (
              <li
                key={notice.id}
                className={`group relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-md ${boxClass}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${
                        isUrgent
                          ? "bg-red-800 text-white"
                          : isImportant
                            ? "bg-amber-600 text-amber-950"
                            : featured
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground/70"
                      }`}
                    >
                      <Bell className="size-4" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-base font-semibold">{notice.title}</h2>
                        {recent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                            <Sparkles className="size-3" />
                            নতুন
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={`mt-0.5 text-xs ${
                          isImportant || isUrgent ? "opacity-80" : "text-muted-foreground"
                        }`}
                      >
                        {formatDateBn(notice.created_at)}
                      </p>
                    </div>
                  </div>
                  <PriorityBadge priority={notice.priority} />
                </div>
                <p
                  className={`mt-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isImportant || isUrgent ? "" : "text-foreground/85"
                  }`}
                >
                  {notice.content}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<Bell className="size-5" />}
          title="নতুন কোনো নোটিশ নেই।"
          description="নতুন ঘোষণা এলে এখানে দেখানো হবে।"
        />
      )}
    </div>
  );
}