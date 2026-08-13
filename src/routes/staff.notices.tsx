import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Loader2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { PriorityBadge } from "@/components/StatusBadge";
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
import { deleteNotice, listNotices, saveNotice } from "@/lib/staff.functions";
import { formatDate } from "@/lib/support-constants";

export const Route = createFileRoute("/staff/notices")({
  head: () => ({
    meta: [
      { title: "Notice Management — Student Support Hub HSC 28" },
      {
        name: "description",
        content: "Publish, edit and remove notices shown to HSC 28 students.",
      },
      { property: "og:title", content: "Notice Management — Student Support Hub HSC 28" },
      { property: "og:description", content: "Control the student notice board." },
    ],
  }),
  component: NoticeManagement,
});

type NoticeForm = {
  id?: string;
  title: string;
  content: string;
  priority: string;
  published: boolean;
};

const emptyNotice: NoticeForm = {
  title: "",
  content: "",
  priority: "Normal",
  published: true,
};

function NoticeManagement() {
  const fetchNotices = useServerFn(listNotices);
  const save = useServerFn(saveNotice);
  const remove = useServerFn(deleteNotice);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NoticeForm | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-notices"],
    queryFn: () => fetchNotices(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff-notices"] });

  const saveMutation = useMutation({
    mutationFn: (values: NoticeForm) =>
      save({
        data: {
          ...(values.id ? { id: values.id } : {}),
          title: values.title,
          content: values.content,
          priority: values.priority,
          published: values.published,
        },
      }),
    onSuccess: () => {
      toast.success("Notice saved.");
      setForm(null);
      void invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "We couldn't save this notice."),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Notices"
        description="Published notices appear on every student dashboard."
        action={
          <Button onClick={() => setForm({ ...emptyNotice })}>
            <Plus className="size-4" />
            New notice
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.length ? (
        <ul className="space-y-3">
          {data.map((notice) => (
            <li key={notice.id} className="card-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-semibold">{notice.title}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(notice.created_at)} ·{" "}
                    {notice.published ? "Published" : "Draft (hidden from students)"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={notice.priority} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm({
                        id: notice.id,
                        title: notice.title,
                        content: notice.content,
                        priority: notice.priority,
                        published: notice.published,
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm("Delete this notice?")) return;
                      try {
                        await remove({ data: { id: notice.id } });
                        toast.success("Notice deleted.");
                        void invalidate();
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "We couldn't delete this notice.",
                        );
                      }
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap text-foreground/85">
                {notice.content}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Bell className="size-5" />}
          title="No notices yet."
          description="Create a notice to inform all students at once."
        />
      )}

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
          <div className="card-panel w-full max-w-lg p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">
                {form.id ? "Edit notice" : "New notice"}
              </h2>
              <button
                onClick={() => setForm(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(form);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="n-title">Title *</Label>
                <Input
                  id="n-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="n-content">Description *</Label>
                <Textarea
                  id="n-content"
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Important">Important</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  />
                  Publish to students
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save notice
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
