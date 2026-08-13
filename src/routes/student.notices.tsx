import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { PriorityBadge } from "@/components/StatusBadge";
import { publishedNotices } from "@/lib/student.functions";
import { formatDate } from "@/lib/support-constants";

export const Route = createFileRoute("/student/notices")({
  head: () => ({
    meta: [
      { title: "Notices — Student Support Hub HSC 28" },
      {
        name: "description",
        content: "Official announcements and updates from the HSC 28 support team.",
      },
      { property: "og:title", content: "Notices — Student Support Hub HSC 28" },
      { property: "og:description", content: "Latest HSC 28 announcements for students." },
    ],
  }),
  component: NoticesPage,
});

function NoticesPage() {
  const fetchNotices = useServerFn(publishedNotices);
  const { data, isLoading } = useQuery({
    queryKey: ["student-notices"],
    queryFn: () => fetchNotices(),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notices" description="Announcements from the support team." />
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.length ? (
        <ul className="space-y-3">
          {data.map((notice) => (
            <li key={notice.id} className="card-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-display text-base font-semibold">{notice.title}</h2>
                <PriorityBadge priority={notice.priority} />
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap text-foreground/85">
                {notice.content}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(notice.created_at)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Bell className="size-5" />} title="No new notices." />
      )}
    </div>
  );
}
