export const SHEET_ID = "1sRmZjhVVhyiALAZUWA8Aw6eF9ME6I0KvvPen92GEva8";
export const SHEET_GID = "0";
export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}`;
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const TTL_MS = 5 * 60 * 1000;

export type ClassItem = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  slot: string;
  courseLabel: string;
  subject: string;
  chapter: string;
  title: string;
  recorded: boolean;
  exam: boolean;
  slide: boolean;
  link: string;
  teacher: string;
  duration: number | null;
};

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function toIso(value: string): string {
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return "";
  const month = MONTHS[(m[1] ?? "").toLowerCase()];
  if (!month) return "";
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
}

export function timeMinutes(t: string) {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if ((m[3] ?? "").toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}

async function fetchRows(): Promise<ClassItem[]> {
  const res = await fetch(CSV_URL, { redirect: "follow" });
  const text = await res.text();
  if (!res.ok || /^\s*<(!doctype|html)/i.test(text)) throw new Error("SHEET_NOT_PUBLIC");

  const get = (r: string[], i: number) => (r[i] ?? "").trim();
  const flag = (r: string[], i: number) => get(r, i).toUpperCase() === "TRUE";
  const items: ClassItem[] = [];

  parseCsv(text).forEach((r, index) => {
    if (index < 2) return; // শিটের প্রথম দুই সারি হেডার
    const date = toIso(get(r, 0));
    if (!date) return;
    const course = get(r, 3);
    const subject = get(r, 4);
    const title = get(r, 6);
    if (!course && !subject && !title) return;
    items.push({
      id: `${date}-${index}`,
      date,
      time: get(r, 1),
      slot: get(r, 2),
      // Preserve the complete sheet label, e.g. "HSC 28 অনলাইন ব্যাচ - ফিজিক্স".
      // The student server function uses this prefix to prevent cross-batch access.
      courseLabel: course,
      subject,
      chapter: get(r, 5),
      title,
      recorded: flag(r, 7),
      exam: flag(r, 8),
      slide: flag(r, 9),
      link: get(r, 11),
      teacher: get(r, 12),
      duration: Number(get(r, 13)) || null,
    });
  });

  items.sort((a, b) => a.date.localeCompare(b.date) || timeMinutes(a.time) - timeMinutes(b.time));
  return items;
}

let cache: { at: number; rows: ClassItem[] } | null = null;

export async function getSchedule(force = false): Promise<ClassItem[]> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  try {
    const rows = await fetchRows();
    cache = { at: Date.now(), rows };
    return rows;
  } catch (err) {
    if (cache) return cache.rows; // শিট না পেলে পুরনো কপি দেখাবে
    throw err;
  }
}

export function normSubject(s: string) {
  return s.toLowerCase().replace(/paper/g, "").replace(/[^a-z0-9]/g, "");
}

export function todayDhaka() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function statusOf(item: ClassItem, today: string): "uploaded" | "pending" | "scheduled" {
  if (item.recorded) return "uploaded";
  return item.date < today ? "pending" : "scheduled";
}
