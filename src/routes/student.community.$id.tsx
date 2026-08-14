import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { communityTicketDetail } from "@/lib/student.functions";
import { bn, formatDateBn, labelCategory, labelCourse } from "@/lib/support-constants";

export const Route = createFileRoute("/student/community/$id")({
  head: () => ({
    meta: [
      { title: "সবার সমস্যা — স্টুডেন্ট সাপোর্ট হাব HSC 28" },
      {
        name: "description",
        content: "ব্যক্তিগত তথ্য ছাড়া একটি জানানো সমস্যা ও তার অফিসিয়াল উত্তর পড়ো।",
      },
      { property: "og:title", content: "সবার সমস্যা — স্টুডেন্ট সাপোর্ট হাব HSC 28" },
      { property: "og:description", content: "HSC 28-এর একটি জানানো সমস্যা ও অফিসিয়াল উত্তর।" },
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
          {error instanceof Error ? error.message : "এই সমস্যাটি খুঁজে পাওয়া যায়নি।"}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/student/community">সবার সমস্যায় ফিরে যাও</Link>
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
        সবার সমস্যা
      </Link>
      <div className="card-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-xs font-semibold tracking-wide text-primary">
              {bn(data.ticket_number)}
            </p>
            <h1 className="font-display mt-1 text-xl font-semibold">{data.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {labelCategory(data.category)}
              {data.course ? ` · ${labelCourse(data.course)}` : ""}
              {data.class_exam ? ` · ${data.class_exam}` : ""} · {formatDateBn(data.created_at)}
            </p>
          </div>
          <StatusBadge status={data.status} />
        </div>
        <p className="mt-4 text-sm whitespace-pre-wrap text-foreground/90">{data.description}</p>
        {data.official_response ? (
          <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 p-4">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              অফিসিয়াল উত্তর
            </p>
            <p className="mt-2 text-sm whitespace-pre-wrap">{data.official_response}</p>
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
            এই সমস্যায় এখনো কোনো অফিসিয়াল উত্তর দেওয়া হয়নি।
          </p>
        )}
        <p className="mt-4 text-xs text-muted-foreground/70">
          শিক্ষার্থীর পরিচয়, যোগাযোগ নম্বর ও সংযুক্তি গোপন থাকে।
        </p>
      </div>
    </div>
  );
}
