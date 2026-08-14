import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Paperclip, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AttachmentList } from "@/components/AttachmentList";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { bn, formatDateBn, labelCategory, labelCourse } from "@/lib/support-constants";
import { addStudentMessage, myTicketDetail } from "@/lib/student.functions";

export const Route = createFileRoute("/student/issues/$id")({
  head: () => ({
    meta: [
      { title: "টিকেটের বিস্তারিত — Student Support Hub HSC 28" },
      {
        name: "description",
        content: "তোমার সাপোর্ট টিকেটের সম্পূর্ণ কথোপকথন, অফিসিয়াল উত্তর ও সংযুক্তি।",
      },
      { property: "og:title", content: "টিকেটের বিস্তারিত — Student Support Hub HSC 28" },
      { property: "og:description", content: "তোমার টিকেটে অফিসিয়াল উত্তর দেখো।" },
    ],
  }),
  component: TicketDetail,
});

function TicketDetail() {
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(myTicketDetail);
  const sendMessage = useServerFn(addStudentMessage);
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-ticket", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  const mutation = useMutation({
    mutationFn: (message: string) => sendMessage({ data: { ticketId: id, message } }),
    onSuccess: () => {
      setReply("");
      toast.success("তোমার বার্তা সাপোর্ট টিমের কাছে পাঠানো হয়েছে।");
      void queryClient.invalidateQueries({ queryKey: ["my-ticket", id] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "তোমার বার্তা পাঠানো যায়নি।"),
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
          {error instanceof Error ? error.message : "তোমার অ্যাকাউন্টে এই টিকেট পাওয়া যায়নি।"}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/student/issues">আমার সমস্যায় ফিরুন</Link>
        </Button>
      </div>
    );
  }

  const { ticket, messages, attachments } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/student/issues"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        আমার সমস্যা
      </Link>

      <div className="card-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-xs font-semibold tracking-wide text-primary">
              {bn(ticket.ticket_number)}
            </p>
            <h1 className="font-display mt-1 text-xl font-semibold">{ticket.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {labelCategory(ticket.category)}
              {ticket.course ? ` · ${labelCourse(ticket.course)}` : ""}
              {ticket.class_exam ? ` · ${ticket.class_exam}` : ""} · {formatDateBn(ticket.created_at)}
            </p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        <p className="mt-4 text-sm whitespace-pre-wrap text-foreground/90">{ticket.description}</p>
        {ticket.official_response ? (
          <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 p-4">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              অফিসিয়াল উত্তর
            </p>
            <p className="mt-2 text-sm whitespace-pre-wrap">{ticket.official_response}</p>
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
            সাপোর্ট টিম এখনো উত্তর দেয়নি। উত্তর এলে এখানে দেখা যাবে।
          </p>
        )}
      </div>

      <div className="card-panel">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Paperclip className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">সংযুক্তি</h2>
        </div>
        <AttachmentList attachments={attachments} />
      </div>

      <div className="card-panel">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">কথোপকথন</h2>
        </div>
        <div className="space-y-3 p-4">
          {messages.length ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.sender_type === "staff"
                    ? "max-w-[85%] rounded-xl bg-primary/10 px-4 py-3"
                    : "ml-auto max-w-[85%] rounded-xl bg-secondary px-4 py-3"
                }
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {message.sender_type === "staff" ? "সাপোর্ট টিম" : "তুমি"} ·{" "}
                  {formatDateBn(message.created_at)}
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{message.message}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">এখনো কোনো বার্তা নেই।</p>
          )}
        </div>
        <div className="border-t border-border p-4">
          <Textarea
            rows={3}
            placeholder="সাপোর্ট টিমের জন্য আরও তথ্য যোগ করো..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            maxLength={2000}
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              disabled={mutation.isPending || reply.trim().length < 2}
              onClick={() => mutation.mutate(reply)}
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              বার্তা পাঠান
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
