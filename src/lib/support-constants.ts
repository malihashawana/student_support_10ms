export const CATEGORIES = ["Class", "Exam", "App/Website", "Others"] as const;

export const COURSES = [
  "Bangla", "English", "ICT", "Physics", "Chemistry", "Biology",
  "Higher Math", "Accounting", "Finance", "Marketing", "Management",
  "Economics", "Geography", "Civics",
] as const;

export const STATUSES = ["Open", "In Progress", "Resolved", "Closed"] as const;
export type TicketStatus = (typeof STATUSES)[number];
export type DisplayLanguage = "bn" | "en";

export const STATUS_STYLES: Record<string, string> = {
  Open: "bg-status-open/15 text-status-open border-status-open/30",
  "In Progress": "bg-status-review/15 text-status-review border-status-review/30",
  Resolved: "bg-status-resolved/15 text-status-resolved border-status-resolved/30",
  Closed: "bg-status-closed/15 text-status-closed border-status-closed/30",
};

export const STATUS_SHORT: Record<string, string> = {
  Open: "Open", "In Progress": "In Progress", Resolved: "Resolved", Closed: "Closed",
};

export const ALLOWED_FILE_TYPES = [
  "image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf",
  "audio/mpeg", "audio/mp3", "audio/wav", "video/mp4", "video/webm",
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
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function formatDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
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

/** Legacy course values are retained for displaying previously submitted tickets. */
export const COURSE_BN: Record<string, string> = {
  Bangla: "বাংলা", English: "ইংরেজি", ICT: "আইসিটি",
  Physics: "পদার্থবিজ্ঞান", Chemistry: "রসায়ন", Biology: "জীববিজ্ঞান",
  "Higher Math": "উচ্চতর গণিত", Accounting: "হিসাববিজ্ঞান",
  Finance: "ফিন্যান্স", Marketing: "মার্কেটিং", Management: "ম্যানেজমেন্ট",
  Economics: "অর্থনীতি", Geography: "ভূগোল", Civics: "পৌরনীতি",
  "Physics 1st Paper": "পদার্থবিজ্ঞান ১ম পত্র",
  "Physics 2nd Paper": "পদার্থবিজ্ঞান ২য় পত্র",
  "Chemistry 1st Paper": "রসায়ন ১ম পত্র",
  "Chemistry 2nd Paper": "রসায়ন ২য় পত্র",
  "Higher Math 1st Paper": "উচ্চতর গণিত ১ম পত্র",
  "Higher Math 2nd Paper": "উচ্চতর গণিত ২য় পত্র",
  Other: "অন্যান্য",
};

export const PRIORITY_BN: Record<string, string> = {
  Normal: "সাধারণ", normal: "সাধারণ",
  High: "গুরুত্বপূর্ণ", high: "গুরুত্বপূর্ণ",
  Important: "গুরুত্বপূর্ণ", important: "গুরুত্বপূর্ণ",
  Urgent: "অতি জরুরি", urgent: "অতি জরুরি",
  Low: "কম", low: "কম",
};

const CATEGORY_BN: Record<string, string> = {
  Class: "ক্লাস", Exam: "পরীক্ষা", "App/Website": "অ্যাপ/ওয়েবসাইট", Others: "অন্যান্য",
  "Live Class": "লাইভ ক্লাস", "Recorded Class": "রেকর্ডেড ক্লাস",
  "Archive Class": "আর্কাইভ ক্লাস", "Other Class": "অন্যান্য ক্লাস",
  "Lecture Slide": "লেকচার স্লাইড", "FB Group Add": "ফেসবুক গ্রুপে যুক্ত করা",
  "Messenger Group Add": "মেসেঞ্জার গ্রুপে যুক্ত করা",
  "Daily Exam": "দৈনিক পরীক্ষা", "Monthly Exam": "মাসিক পরীক্ষা", Reward: "পুরস্কার",
};

const STATUS_BN: Record<string, string> = {
  Open: "খোলা", "In Progress": "কাজ চলছে", Resolved: "সমাধান হয়েছে",
  Closed: "বন্ধ", "In Review": "পর্যালোচনাধীন",
  "Waiting for Information": "তথ্যের অপেক্ষায়",
};

const COURSE_EN_BY_BN: Record<string, string> = Object.fromEntries(
  Object.entries(COURSE_BN).map(([en, bnValue]) => [bnValue, en]),
);

export function labelCategory(value: string | null | undefined, language: DisplayLanguage = "en"): string {
  if (!value) return "—";
  return language === "bn" ? CATEGORY_BN[value] ?? value : value;
}

export function labelCourse(value: string | null | undefined, language: DisplayLanguage = "bn"): string {
  if (!value) return "—";
  if (language === "bn") return COURSE_BN[value] ?? value;
  return COURSE_EN_BY_BN[value] ?? value;
}

export function labelStatus(
  value: string | null | undefined,
  short = false,
  language: DisplayLanguage = "en",
): string {
  if (!value) return "—";
  if (language === "bn") return STATUS_BN[value] ?? value;
  return short ? STATUS_SHORT[value] ?? value : value;
}

export function labelPriority(value: string | null | undefined, language: DisplayLanguage = "bn"): string {
  if (!value) return "—";
  if (language === "en") return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  return PRIORITY_BN[value] ?? value;
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export function bn(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function formatDateBn(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("bn-BD", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function formatDateShortBn(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("bn-BD", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function formatBytesBn(bytes: number | null | undefined): string {
  return bn(formatBytes(bytes));
}
