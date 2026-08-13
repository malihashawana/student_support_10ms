import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { hashPassword } from "./session.server";

export const db = supabaseAdmin;

const DEFAULT_STAFF_USERNAME = "TENMS";
const DEFAULT_STAFF_PASSWORD = "tenten10";

/** Creates the initial support-team account (hashed) the first time it is needed. */
export async function ensureDefaultStaff() {
  const { count } = await db.from("staff_users").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;
  const password_hash = await hashPassword(DEFAULT_STAFF_PASSWORD);
  await db
    .from("staff_users")
    .insert({ username: DEFAULT_STAFF_USERNAME, password_hash, role: "admin" });
}

export function normalizeContact(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export type PublicTicket = {
  id: string;
  ticket_number: string;
  category: string;
  title: string;
  description: string;
  course: string | null;
  status: string;
  official_response: string | null;
  created_at: string;
  resolved_at: string | null;
};

export function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  return "\uFEFF" + lines.join("\r\n");
}

const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  student_name: "name",
  "student name": "name",
  full_name: "name",
  phone: "contact_number",
  contact: "contact_number",
  contact_number: "contact_number",
  phone_number: "contact_number",
  mobile: "contact_number",
  "contact number": "contact_number",
  login_number: "contact_number",
  student_id: "student_code",
  login_id: "student_code",
  studentid: "student_code",
  roll: "student_code",
  "student id": "student_code",
  email: "email",
  email_address: "email",
  "email address": "email",
};

export function mapHeader(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/\uFEFF/g, "");
  return HEADER_ALIASES[key] ?? null;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const char = src[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += char;
    } else if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export type ParsedStudentRow = {
  line: number;
  name: string;
  contact_number: string;
  student_code: string | null;
  email: string | null;
  issue?: string;
};

export type CsvAnalysis = {
  detected: number;
  valid: ParsedStudentRow[];
  duplicates: ParsedStudentRow[];
  invalid: ParsedStudentRow[];
  unmappedHeaders: string[];
};

export async function analyzeStudentCsv(text: string): Promise<CsvAnalysis> {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { detected: 0, valid: [], duplicates: [], invalid: [], unmappedHeaders: [] };
  }
  const headerRow = rows[0]!;
  const mapped = headerRow.map(mapHeader);
  const unmappedHeaders = headerRow.filter((h, i) => h.trim() !== "" && mapped[i] === null);

  const valid: ParsedStudentRow[] = [];
  const duplicates: ParsedStudentRow[] = [];
  const invalid: ParsedStudentRow[] = [];
  const seen = new Set<string>();

  const { data: existing } = await db.from("students").select("contact_number");
  const existingSet = new Set((existing ?? []).map((s) => s.contact_number));

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]!;
    const record: Record<string, string> = {};
    mapped.forEach((key, idx) => {
      if (key) record[key] = (cells[idx] ?? "").trim();
    });
    const contact = normalizeContact(record["contact_number"] ?? "");
    const entry: ParsedStudentRow = {
      line: i + 1,
      name: record["name"] ?? "",
      contact_number: contact,
      student_code: record["student_code"] || null,
      email: record["email"] || null,
    };
    if (!entry.name || contact.length < 6) {
      invalid.push({ ...entry, issue: !entry.name ? "Missing name" : "Invalid contact number" });
      continue;
    }
    if (seen.has(contact) || existingSet.has(contact)) {
      duplicates.push({ ...entry, issue: "Already in the database" });
      continue;
    }
    seen.add(contact);
    valid.push(entry);
  }

  return { detected: rows.length - 1, valid, duplicates, invalid, unmappedHeaders };
}
