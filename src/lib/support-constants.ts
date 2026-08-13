export const CATEGORIES = [
  "Sound",
  "Video",
  "Exam",
  "Recorded Lecture",
  "Live Class",
  "App / Website",
  "Payment / Subscription",
  "Study Material",
  "Account / Login",
  "Other",
] as const;

export const COURSES = [
  "Physics 1st Paper",
  "Physics 2nd Paper",
  "Chemistry 1st Paper",
  "Chemistry 2nd Paper",
  "Higher Math 1st Paper",
  "Higher Math 2nd Paper",
  "Biology",
  "ICT",
  "English",
  "Bangla",
] as const;

export const STATUSES = [
  "Open",
  "In Review",
  "Waiting for Information",
  "Resolved",
  "Closed",
] as const;

export type TicketStatus = (typeof STATUSES)[number];

export const STATUS_STYLES: Record<string, string> = {
  Open: "bg-status-open/15 text-status-open border-status-open/30",
  "In Review": "bg-status-review/15 text-status-review border-status-review/30",
  "Waiting for Information": "bg-status-waiting/15 text-status-waiting border-status-waiting/30",
  Resolved: "bg-status-resolved/15 text-status-resolved border-status-resolved/30",
  Closed: "bg-status-closed/15 text-status-closed border-status-closed/30",
};

export const STATUS_SHORT: Record<string, string> = {
  Open: "Open",
  "In Review": "In Review",
  "Waiting for Information": "Waiting",
  Resolved: "Resolved",
  Closed: "Closed",
};

export const ALLOWED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "video/mp4",
  "video/webm",
];

export const MAX_FILE_MB = 8;
export const MAX_FILES = 5;

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
