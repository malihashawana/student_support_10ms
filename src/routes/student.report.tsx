import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Paperclip, Send, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
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
import { uploadAttachment } from "@/lib/attachments.functions";
import { createTicket } from "@/lib/student.functions";
import {
  ALLOWED_FILE_TYPES,
  CATEGORIES,
  COURSES,
  MAX_FILES,
  MAX_FILE_MB,
  formatBytes,
  formatDate,
} from "@/lib/support-constants";

export const Route = createFileRoute("/student/report")({
  head: () => ({
    meta: [
      { title: "Report a Problem — Student Support Hub HSC 28" },
      {
        name: "description",
        content:
          "Submit a new HSC 28 support ticket with a category, description, attachments or links.",
      },
      { property: "og:title", content: "Report a Problem — Student Support Hub HSC 28" },
      { property: "og:description", content: "Tell the support team what went wrong." },
    ],
  }),
  component: ReportPage,
});

type Submitted = {
  id: string;
  ticket_number: string;
  category: string;
  status: string;
  created_at: string;
};

function ReportPage() {
  const navigate = useNavigate();
  const submit = useServerFn(createTicket);
  const upload = useServerFn(uploadAttachment);
  const fileInput = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [course, setCourse] = useState("");
  const [classExam, setClassExam] = useState("");
  const [link, setLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Submitted | null>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: File[] = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) {
        toast.error(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: this file type is not supported.`);
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${file.name}: files must be smaller than ${MAX_FILE_MB} MB.`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function toBase64(file: File) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(binary);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const ticket = await submit({
        data: {
          category,
          title,
          description,
          course: course || null,
          class_exam: classExam || null,
          link: link || null,
        },
      });
      for (const file of files) {
        try {
          await upload({
            data: {
              ticketId: ticket.id,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              base64: await toBase64(file),
            },
          });
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : `Upload failed for ${file.name}.`,
          );
        }
      }
      setDone(ticket);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't submit your problem.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card-panel p-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-status-resolved/15 text-status-resolved">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="font-display mt-4 text-xl font-semibold">
            Your problem has been submitted successfully.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Our support team will review it and respond on this ticket.
          </p>
          <dl className="mt-6 grid gap-3 text-left text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">Ticket ID</dt>
              <dd className="font-display font-semibold">{done.ticket_number}</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">Category</dt>
              <dd>{done.category}</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge status={done.status} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Submitted</dt>
              <dd>{formatDate(done.created_at)}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate({ to: "/student/issues/$id", params: { id: done.id } })}>
              View ticket
            </Button>
            <Button variant="outline" asChild>
              <Link to="/student">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Report a Problem"
        description="Describe what happened. You don't need to choose a team — support will route it internally."
      />
      <form onSubmit={handleSubmit} className="card-panel space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Problem category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Related course / subject</Label>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {COURSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Problem title *</Label>
          <Input
            id="title"
            placeholder="Physics class audio is not working"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Problem description *</Label>
          <Textarea
            id="description"
            placeholder="Please describe your problem clearly."
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={4000}
            required
          />
          <p className="text-xs text-muted-foreground">{description.length}/4000</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="classExam">Related class / exam</Label>
            <Input
              id="classExam"
              placeholder="Lecture 12 / Weekly Exam 04"
              value={classExam}
              onChange={(e) => setClassExam(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link">Video / Drive / other link</Label>
            <Input
              id="link"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Attachments</Label>
          <div className="rounded-lg border border-dashed border-border p-4">
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              multiple
              accept={ALLOWED_FILE_TYPES.join(",")}
              onChange={(e) => addFiles(e.target.files)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
                <Upload className="size-4" />
                Choose files
              </Button>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP, PDF, MP3, WAV, MP4, WebM · up to {MAX_FILE_MB} MB each · max{" "}
                {MAX_FILES} files
              </p>
            </div>
            {files.length ? (
              <ul className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm"
                  >
                    <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link to="/student">Cancel</Link>
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Submit Problem
          </Button>
        </div>
      </form>
    </div>
  );
}
