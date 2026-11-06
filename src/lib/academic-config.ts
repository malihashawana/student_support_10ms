
export const ACADEMIC_BATCHES = ["hsc_27", "hsc_28"] as const;

export const ACADEMIC_GROUPS = [
  "science",
  "business_studies",
  "humanities",
] as const;

export type AcademicBatch = (typeof ACADEMIC_BATCHES)[number];
export type AcademicGroup = (typeof ACADEMIC_GROUPS)[number];

export type Language = "bn" | "en";

export const BATCH_LABELS: Record<
  AcademicBatch,
  { en: string; bn: string }
> = {
  hsc_27: { en: "HSC 27", bn: "এইচএসসি ২৭" },
  hsc_28: { en: "HSC 28", bn: "এইচএসসি ২৮" },
};

export const GROUP_LABELS: Record<
  AcademicGroup,
  { en: string; bn: string }
> = {
  science: { en: "Science", bn: "বিজ্ঞান" },
  business_studies: {
    en: "Business Studies",
    bn: "ব্যবসায় শিক্ষা",
  },
  humanities: { en: "Humanities", bn: "মানবিক" },
};

export const SUBJECTS = {
  physics: { en: "Physics", bn: "পদার্থবিজ্ঞান" },
  chemistry: { en: "Chemistry", bn: "রসায়ন" },
  math: { en: "Math", bn: "উচ্চতর গণিত" },
  biology: { en: "Biology", bn: "জীববিজ্ঞান" },
  bangla: { en: "Bangla", bn: "বাংলা" },
  english: { en: "English", bn: "ইংরেজি" },
  ict: { en: "ICT", bn: "আইসিটি" },
  finance: { en: "Finance", bn: "ফিন্যান্স" },
  accounting: { en: "Accounting", bn: "হিসাববিজ্ঞান" },
  management: { en: "Management", bn: "ব্যবস্থাপনা" },
  marketing: { en: "Marketing", bn: "মার্কেটিং" },
  geography: { en: "Geography", bn: "ভূগোল" },
  economics: { en: "Economics", bn: "অর্থনীতি" },
  civics: { en: "Civics", bn: "পৌরনীতি" },
} as const;

export type SubjectId = keyof typeof SUBJECTS;

const COMMON_SUBJECTS: SubjectId[] = [
  "bangla",
  "english",
  "ict",
];

const GROUP_SUBJECTS: Record<AcademicGroup, SubjectId[]> = {
  science: ["physics", "chemistry", "math", "biology"],
  business_studies: [
    "finance",
    "accounting",
    "management",
    "marketing",
  ],
  humanities: ["geography", "economics", "civics"],
};

export function getSubjectsForGroup(
  group: AcademicGroup,
): SubjectId[] {
  return [...GROUP_SUBJECTS[group], ...COMMON_SUBJECTS];
}

export function getSubjectLabel(
  subject: SubjectId,
  language: Language,
): string {
  return SUBJECTS[subject][language];
}

export function isAcademicBatch(
  value: unknown,
): value is AcademicBatch {
  return ACADEMIC_BATCHES.some((batch) => batch === value);
}

export function isAcademicGroup(
  value: unknown,
): value is AcademicGroup {
  return ACADEMIC_GROUPS.some((group) => group === value);
}
