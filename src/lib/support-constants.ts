export const CATEGORIES = [
  "Live Class",
  "Recorded Class",
  "Archive Class",
  "Other Class",
  "App/Website",
  "Lecture Slide",
  "FB Group Add",
  "Messenger Group Add",
  "Daily Exam",
  "Monthly Exam",
  "Reward",
  "Others",
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
  "Other",
] as const;

export const STATUSES = ["Open", "In Progress", "Resolved", "Closed"] as const;

export type TicketStatus = (typeof STATUSES)[number];

export const STATUS_STYLES: Record<string, string> = {
  Open: "bg-status-open/15 text-status-open border-status-open/30",
  "In Progress": "bg-status-review/15 text-status-review border-status-review/30",
  Resolved: "bg-status-resolved/15 text-status-resolved border-status-resolved/30",
  Closed: "bg-status-closed/15 text-status-closed border-status-closed/30",
};

export const STATUS_SHORT: Record<string, string> = {
  Open: "Open",
  "In Progress": "In Progress",
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

/* ---------------------------------------------------------------
 * Category & status are now shown in plain English for everyone
 * (student + team). Course names stay in Bangla (not requested to change).
 * --------------------------------------------------------------- */

export const COURSE_BN: Record<string, string> = {
  "Physics 1st Paper": "পদার্থবিজ্ঞান ১ম পত্র",
  "Physics 2nd Paper": "পদার্থবিজ্ঞান ২য় পত্র",
  "Chemistry 1st Paper": "রসায়ন ১ম পত্র",
  "Chemistry 2nd Paper": "রসায়ন ২য় পত্র",
  "Higher Math 1st Paper": "উচ্চতর গণিত ১ম পত্র",
  "Higher Math 2nd Paper": "উচ্চতর গণিত ২য় পত্র",
  Biology: "জীববিজ্ঞান",
  ICT: "আইসিটি",
  English: "ইংরেজি",
  Bangla: "বাংলা",
  Other: "Other",
};

export const PRIORITY_BN: Record<string, string> = {
  Normal: "সাধারণ",
  normal: "সাধারণ",
  High: "গুরুত্বপূর্ণ",
  high: "গুরুত্বপূর্ণ",
  Important: "গুরুত্বপূর্ণ",
  important: "গুরুত্বপূর্ণ",
  Urgent: "অতি জরুরি",
  urgent: "অতি জরুরি",
  Low: "কম",
  low: "কম",
};

export function labelCategory(value: string | null | undefined): string {
  if (!value) return "—";
  return value;
}

export function labelCourse(value: string | null | undefined): string {
  if (!value) return "—";
  return COURSE_BN[value] ?? value;
}

export function labelStatus(value: string | null | undefined, short = false): string {
  if (!value) return "—";
  if (short) return STATUS_SHORT[value] ?? value;
  return value;
}

export function labelPriority(value: string | null | undefined): string {
  if (!value) return "—";
  return PRIORITY_BN[value] ?? value;
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Converts ASCII digits inside any string/number to Bangla digits. */
export function bn(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function formatDateBn(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("bn-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShortBn(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("bn-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatBytesBn(bytes: number | null | undefined): string {
  return bn(formatBytes(bytes));
}