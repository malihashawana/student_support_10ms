import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Paperclip, Send, Upload, X, Headphones, FileText, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";

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
  bn,
  formatBytesBn,
  formatBytes,
  formatDateBn,
  labelCategory,
  labelCourse,
} from "@/lib/support-constants";

export const Route = createFileRoute("/student/report")({
  head: () => ({
    meta: [
      { title: "সমস্যা জানান — Student Support Hub HSC 28" },
      {
        name: "description",
        content: "ধরন, বিবরণ, সংযুক্তি বা লিংকসহ নতুন HSC 28 সাপোর্ট টিকেট জমা দাও।",
      },
      { property: "og:title", content: "সমস্যা জানান — Student Support Hub HSC 28" },
      { property: "og:description", content: "সাপোর্ট টিমকে জানাও কী সমস্যা হয়েছে।" },
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
  const { language, t } = useLanguage();
  const num = (value: string | number) => language === "bn" ? bn(value) : String(value).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());
  const date = (value: string) => language === "bn" ? formatDateBn(value) : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const bytes = (value: number) => language === "bn" ? formatBytesBn(value) : formatBytes(value);
  const categoryLabel = (value: string) => labelCategory(value, language);
  const courseLabel = (value: string) => labelCourse(value, language);
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
        toast.error(t(`তুমি সর্বোচ্চ ${bn(MAX_FILES)}টি ফাইল যুক্ত করতে পারবে।`, `You can attach up to ${MAX_FILES} files.`));
        break;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(t(`${file.name}: এই ফাইল টাইপ সাপোর্ট করে না।`, `${file.name}: Unsupported file type.`));
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(t(`${file.name}: ফাইল অবশ্যই ${bn(MAX_FILE_MB)} MB-এর কম হতে হবে।`, `${file.name}: File must be no larger than ${MAX_FILE_MB} MB.`));
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
          toast.error(err instanceof Error ? err.message : t(`${file.name} আপলোড ব্যর্থ হয়েছে।`, `${file.name}: Upload failed.`));
        }
      }
      setDone(ticket);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("তোমার সমস্যা জমা দেওয়া যায়নি।", "Could not submit your ticket."));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card-panel overflow-hidden rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-status-resolved/15 text-status-resolved">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="font-display mt-4 text-xl font-semibold">
            {t("তোমার সমস্যা সফলভাবে জমা হয়েছে।", "Your ticket was submitted successfully.")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("আমাদের সাপোর্ট টিম এটি পর্যালোচনা করে এই টিকেটে উত্তর দেবে।", "Our support team will review your ticket and respond here.")}
          </p>
          <dl className="mt-6 grid gap-3 text-left text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">{t("টিকেট আইডি", "Ticket ID")}</dt>
              <dd className="font-display font-semibold">{num(done.ticket_number)}</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">{t("ধরন", "Category")}</dt>
              <dd>{categoryLabel(done.category)}</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">{t("অবস্থা", "Status")}</dt>
              <dd>
                <StatusBadge status={done.status} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("জমা দেওয়া হয়েছে", "Submitted on")}</dt>
              <dd>{date(done.created_at)}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => navigate({ to: "/student/issues/$id", params: { id: done.id } })}
            >
              {t("টিকেট দেখুন", "View Ticket")}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/student">{t("ড্যাশবোর্ডে ফিরুন", "Back to Dashboard")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 overflow-hidden rounded-2xl border border-[#8B1E2D]/20 bg-gradient-to-br from-[#300c16] via-[#651727] to-[#942538] px-6 py-7 text-white shadow-lg sm:px-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
          <Headphones className="size-4" />
          {t("১০ মিনিট স্কুল সাপোর্ট", "10 Minute School Support")}
        </div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {t("কী সমস্যা হচ্ছে?", "How can we help?")}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
          {t("সমস্যার বিস্তারিত জানাও। সাপোর্ট টিম তোমার টিকিট দেখে সাহায্য করবে।", "Tell us what went wrong. Our support team will review your ticket and help you.")}
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/85">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><FileText className="size-3.5" />{t("সমস্যা লিখো", "Describe issue")}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><Paperclip className="size-3.5" />{t("প্রয়োজনে ফাইল যোগ করো", "Add files if needed")}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><Sparkles className="size-3.5" />{t("টিকিট ট্র্যাক করো", "Track your ticket")}</span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="card-panel space-y-6 rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-7">
        <div className="border-b border-border pb-4">
          <h2 className="font-display text-lg font-semibold">{t("নতুন সাপোর্ট টিকিট", "New support ticket")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("* চিহ্নিত তথ্যগুলো পূরণ করা আবশ্যক।", "Fields marked * are required.")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("সমস্যার ধরন *", "Issue Category *")}</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder={t("একটি ধরন বেছে নাও", "Select a category")} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoryLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("সংশ্লিষ্ট বিষয়", "Related Subject")}</Label>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger>
                <SelectValue placeholder={t("ঐচ্ছিক", "Optional")} />
              </SelectTrigger>
              <SelectContent>
                {COURSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {courseLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">{t("সমস্যার শিরোনাম (ঐচ্ছিক)", "Issue Title (Optional)")}</Label>
          <Input
            id="title"
            placeholder={t("পদার্থবিজ্ঞান ক্লাসের অডিও কাজ করছে না", "Audio is not working in my physics class")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t("সমস্যার বিবরণ *", "Issue Description *")}</Label>
          <Textarea
            id="description"
            placeholder={t("তোমার সমস্যাটি স্পষ্টভাবে লেখো।", "Describe your issue clearly.")}
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={4000}
            required
          />
          <p className="text-xs text-muted-foreground">
            {num(description.length)}/{num(4000)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="classExam">{t("সংশ্লিষ্ট ক্লাস / পরীক্ষা", "Related Class / Exam")}</Label>
            <Input
              id="classExam"
              placeholder={t("লেকচার ১২ / সাপ্তাহিক পরীক্ষা ০৪", "Lecture 12 / Weekly Exam 04")}
              value={classExam}
              onChange={(e) => setClassExam(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link">{t("ভিডিও / ড্রাইভ / অন্য লিংক", "Video / Drive / Other Link")}</Label>
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
          <Label>{t("সংযুক্তি", "Attachments")}</Label>
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
                {t("ফাইল বেছে নাও", "Choose Files")}
              </Button>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP, PDF, MP3, WAV, MP4, WebM · {t("প্রতিটি সর্বোচ্চ", "Max per file")} {num(MAX_FILE_MB)} MB ·
                {t("সর্বোচ্চ", "Up to")} {num(MAX_FILES)} {t("টি ফাইল", "files")}
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
                    <span className="text-xs text-muted-foreground">
                      {bytes(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={t(`${file.name} সরান`, `Remove ${file.name}`)}
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
            <Link to="/student">{t("বাতিল", "Cancel")}</Link>
          </Button>
          <Button type="submit" disabled={busy || !category || description.trim().length < 10} className="bg-[#8B1E2D] text-white hover:bg-[#a52436]">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {t("সমস্যা জমা দিন", "Submit Ticket")}
          </Button>
        </div>
      </form>
    </div>
  );
}
