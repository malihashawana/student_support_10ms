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
import { formatDate } from "@/lib/support-constants";
import { addStudentMessage, myTicketDetail } from "@/lib/student.functions";

export const Route = createFileRoute("/student/issues/$id")({
  head: () => ({
    meta: [
      { title: "Ticket Details — Student Support Hub HSC 28" },
      {
        name: "description",
        content: "Full conversation, official response and attachments for your support ticket.",
      },
      { property: "og:title", content: "Ticket Details — Student Support Hub HSC 28" },
      { property: "og:description", content: "See the official response on your ticket." },
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
      toast.success("Your message was sent to the support team.");
      void queryClient.invalidateQueries({ queryKey: ["my-ticket", id] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Your message could not be sent."),
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
          {error instanceof Error ? error.message : "This ticket was not found in your account."}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/student/issues">Back to my issues</Link>
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
        My Issues
      </Link>

      <div className="card-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-xs font-semibold tracking-wide text-primary">
              {ticket.ticket_number}
            </p>
            <h1 className="font-display mt-1 text-xl font-semibold">{ticket.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {ticket.category}
              {ticket.course ? ` · ${ticket.course}` : ""}
              {ticket.class_exam ? ` · ${ticket.class_exam}` : ""} · {formatDate(ticket.created_at)}
            </p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        <p className="mt-4 text-sm whitespace-pre-wrap text-foreground/90">{ticket.description}</p>
        {ticket.official_response ? (
          <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 p-4">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              Official response
            </p>
            <p className="mt-2 text-sm whitespace-pre-wrap">{ticket.official_response}</p>
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
            The support team has not responded yet. You will see their reply here.
          </p>
        )}
      </div>

      <div className="card-panel">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Paperclip className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Attachments</h2>
        </div>
        <AttachmentList attachments={attachments} />
      </div>

      <div className="card-panel">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Conversation</h2>
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
                  {message.sender_type === "staff" ? "Support team" : "You"} ·{" "}
                  {formatDate(message.created_at)}
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{message.message}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          )}
        </div>
        <div className="border-t border-border p-4">
          <Textarea
            rows={3}
            placeholder="Add more information for the support team..."
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
              Send message
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
