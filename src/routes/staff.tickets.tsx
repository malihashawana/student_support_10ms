import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Paperclip, Save, Search, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { AttachmentList } from "@/components/AttachmentList";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  exportTicketsCsv,
  staffAddMessage,
  staffTicketDetail,
  staffTickets,
  staffUpdateTicket,
  type StaffTicketFilters,
} from "@/lib/staff.functions";
import {
  CATEGORIES,
  COURSES,
  STATUSES,
  downloadCsv,
  formatDate,
  formatDateShort,
} from "@/lib/support-constants";

export const Route = createFileRoute("/staff/tickets")({
  head: () => ({
    meta: [
      { title: "Issue Workspace — Student Support Hub HSC 28" },
      {
        name: "description",
        content:
          "Spreadsheet-style workspace to filter, respond to and resolve HSC 28 student issues.",
      },
      { property: "og:title", content: "Issue Workspace — Student Support Hub HSC 28" },
      { property: "og:description", content: "Filter, answer and export student issues." },
    ],
  }),
  component: TicketWorkspace,
});

function TicketWorkspace() {
  const fetchTickets = useServerFn(staffTickets);
  const exportCsv = useServerFn(exportTicketsCsv);
  const [filters, setFilters] = useState<StaffTicketFilters>({
    search: "",
    status: "all",
    category: "all",
    course: "all",
    range: "all",
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-tickets", filters],
    queryFn: () => fetchTickets({ data: filters }),
  });

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportCsv({ data: filters });
      downloadCsv(`hsc28-issues-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast.success("CSV export downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Issue Workspace"
        description={`${data?.length ?? 0} issues match the current filters.`}
        action={
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Export CSV
          </Button>
        }
      />

      <div className="card-panel mb-4 grid gap-3 p-4 lg:grid-cols-5">
        <div className="flex items-center gap-2 rounded-md border border-input px-3 lg:col-span-2">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search ticket, student, contact or keyword"
            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, status: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.category ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, category: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.range ?? "all"}
          onValueChange={(v) =>
            setFilters({ ...filters, range: v as NonNullable<StaffTicketFilters["range"]> })
          }

        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>
        {filters.range === "custom" ? (
          <div className="flex items-center gap-2 lg:col-span-2">
            <Input
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </div>
        ) : null}
        <Select
          value={filters.course ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, course: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {COURSES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="card-panel overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : data?.length ? (
          <div className="sheet-scroll max-h-[70vh]">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 z-10 bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Ticket</th>
                  <th className="px-3 py-2 text-left font-medium">Student</th>
                  <th className="px-3 py-2 text-left font-medium">Contact</th>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-left font-medium">Problem</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelected(ticket.id)}
                    className="cursor-pointer transition-colors hover:bg-secondary/60"
                  >
                    <td className="px-3 py-2 font-medium whitespace-nowrap text-primary">
                      {ticket.ticket_number}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{ticket.students?.name ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {ticket.students?.contact_number ?? "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{ticket.category}</td>
                    <td className="max-w-[320px] px-3 py-2">
                      <span className="line-clamp-1">{ticket.title}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {formatDateShort(ticket.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={ticket.status} short />
                    </td>
                    <td className="max-w-[240px] px-3 py-2 text-muted-foreground">
                      <span className="line-clamp-1">
                        {ticket.official_response ?? "No response yet"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Search className="size-5" />}
            title="No issues found matching your filters."
            description="Try clearing the search or widening the date range."
          />
        )}
      </div>

      {selected ? <TicketDrawer id={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function TicketDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const fetchDetail = useServerFn(staffTicketDetail);
  const update = useServerFn(staffUpdateTicket);
  const addMessage = useServerFn(staffAddMessage);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["staff-ticket", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  const [status, setStatus] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (sendResponse: boolean) =>
      update({
        data: {
          id,
          status: status ?? data?.ticket.status ?? "Open",
          response: response ?? data?.ticket.official_response ?? "",
          sendResponse,
        },

      }),
    onSuccess: () => {
      toast.success("Ticket updated.");
      void queryClient.invalidateQueries({ queryKey: ["staff-ticket", id] });
      void queryClient.invalidateQueries({ queryKey: ["staff-tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["staff-overview"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "We couldn't update this ticket."),
  });

  const messageMutation = useMutation({
    mutationFn: () => addMessage({ data: { ticketId: id, message: note, internal } }),
    onSuccess: () => {
      setNote("");
      toast.success(internal ? "Internal note saved." : "Message sent to the student.");
      void queryClient.invalidateQueries({ queryKey: ["staff-ticket", id] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Your message could not be sent."),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30 backdrop-blur-sm">
      <button className="flex-1" aria-label="Close panel" onClick={onClose} />
      <aside className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-surface shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <h2 className="font-display text-sm font-semibold">
            {data?.ticket.ticket_number ?? "Ticket"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {isLoading || !data ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 p-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">{data.ticket.title}</h3>
                <StatusBadge status={data.ticket.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.ticket.category}
                {data.ticket.course ? ` · ${data.ticket.course}` : ""}
                {data.ticket.class_exam ? ` · ${data.ticket.class_exam}` : ""} ·{" "}
                {formatDate(data.ticket.created_at)}
              </p>
              <p className="mt-3 text-sm whitespace-pre-wrap">{data.ticket.description}</p>
            </div>


            <div className="rounded-lg bg-secondary/60 p-3 text-sm">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Student
              </p>
              <p className="mt-1 font-medium">{data.ticket.students?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                {data.ticket.students?.contact_number ?? "—"}
                {data.ticket.students?.student_code
                  ? ` · ${data.ticket.students.student_code}`
                  : ""}
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={status ?? data.ticket.status}
                  onValueChange={(v) => setStatus(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Official response (visible to the student)</Label>
                <Textarea
                  rows={4}
                  value={response ?? data.ticket.official_response ?? ""}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Write the official answer for this issue..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(false)}
                >
                  <Save className="size-4" />
                  Save
                </Button>
                <Button
                  size="sm"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(true)}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Save &amp; send response
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <Paperclip className="size-4" />
                Attachments
              </p>
              <div className="rounded-lg border border-border">
                <AttachmentList attachments={data.attachments} />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Conversation
              </p>
              <div className="space-y-2">
                {data.messages.length ? (
                  data.messages.map((message) => (
                    <div
                      key={message.id}
                      className={
                        message.internal
                          ? "rounded-lg border border-dashed border-border bg-secondary/50 px-3 py-2"
                          : message.sender_type === "staff"
                            ? "ml-auto max-w-[90%] rounded-lg bg-primary/10 px-3 py-2"
                            : "max-w-[90%] rounded-lg bg-secondary px-3 py-2"
                      }
                    >
                      <p className="text-xs text-muted-foreground">
                        {message.internal
                          ? `Internal note · ${message.sender_name ?? "Support"}`
                          : message.sender_type === "staff"
                            ? `Support · ${message.sender_name ?? ""}`
                            : "Student"}{" "}
                        · {formatDate(message.created_at)}
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{message.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                )}
              </div>
              <Textarea
                className="mt-3"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write a message or internal note..."
              />
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(e) => setInternal(e.target.checked)}
                  />
                  Internal note (hidden from student)
                </label>
                <Button
                  size="sm"
                  disabled={messageMutation.isPending || note.trim().length < 2}
                  onClick={() => messageMutation.mutate()}
                >
                  {messageMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
