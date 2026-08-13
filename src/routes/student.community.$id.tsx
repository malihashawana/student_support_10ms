import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { communityTicketDetail } from "@/lib/student.functions";
import { formatDate } from "@/lib/support-constants";

export const Route = createFileRoute("/student/community/$id")({
  head: () => ({
    meta: [
      { title: "Community Issue — Student Support Hub HSC 28" },
      {
        name: "description",
        content: "Read a community-reported problem and its official response, without private data.",
      },
      { property: "og:title", content: "Community Issue — Student Support Hub HSC 28" },
      { property: "og:description", content: "A reported HSC 28 problem and the official answer." },
    ],
  }),
  component: CommunityDetail,
});

function CommunityDetail() {
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(communityTicketDetail);
  const { data, isLoading, error } = useQuery({
    queryKey: ["community-ticket", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card-panel p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "This issue could not be found."}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/student/community">Back to community issues</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        to="/student/community"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Community Issues
      </Link>
      <div className="card-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-xs font-semibold tracking-wide text-primary">
              {data.ticket_number}
            </p>
            <h1 className="font-display mt-1 text-xl font-semibold">{data.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.category}
              {data.course ? ` · ${data.course}` : ""}
              {data.class_exam ? ` · ${data.class_exam}` : ""} · {formatDate(data.created_at)}
            </p>
          </div>
          <StatusBadge status={data.status} />
        </div>
        <p className="mt-4 text-sm whitespace-pre-wrap text-foreground/90">{data.description}</p>
        {data.official_response ? (
          <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 p-4">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              Official response
            </p>
            <p className="mt-2 text-sm whitespace-pre-wrap">{data.official_response}</p>
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
            No official response yet on this issue.
          </p>
        )}
        <p className="mt-4 text-xs text-muted-foreground/70">
          Student identity, contact number and attachments stay private.
        </p>
      </div>
    </div>
  );
}
