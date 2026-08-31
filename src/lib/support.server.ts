import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashPassword } from "./session.server";

export const db = supabaseAdmin;

export function normalizeContact(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export function normalizeLoginNumber(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function normalizeTmsCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

/** A cell may hold one or more comma-separated TMS codes. */
export function splitTmsField(value: string): string[] {
  return value.split(",").map(normalizeTmsCode).filter(Boolean);
}

export function isValidTmsTransactionId(value: string): boolean {
  return /^TMS\d{8}$/.test(value);
}

export { normalizeTmsCode };

const DEFAULT_STAFF_USERNAME = "TENMS";
const DEFAULT_STAFF_PASSWORD = "tenten10";

export async function ensureDefaultStaff() {
  const { count } = await db.from("staff_users").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;
  const password_hash = await hashPassword(DEFAULT_STAFF_PASSWORD);
  await db.from("staff_users").insert({
    username: DEFAULT_STAFF_USERNAME,
    password_hash,
    role: "admin",
  });
}

export function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}

const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  student_name: "name",
  "student name": "name",
  full_name: "name",
  "full name": "name",
  login_number: "login_number",
  "login number": "login_number",
  login_no: "login_number",
  "login no": "login_number",
  contact_number: "contact_number",
  "contact number": "contact_number",
  phone: "contact_number",
  phone_number: "contact_number",
  mobile: "contact_number",
  contact: "contact_number",
  tms_transaction_id: "tms_transaction_id",
  "tms transaction id": "tms_transaction_id",
  tms_id: "tms_transaction_id",
  "tms id": "tms_transaction_id",
  transaction_id: "tms_transaction_id",
  "transaction id": "tms_transaction_id",
  student_id: "student_code",
  "student id": "student_code",
  student_code: "student_code",
  login_id: "student_code",
  roll: "student_code",
  email: "email",
  email_address: "email",
  "email address": "email",
  course: "course_name",
  course_name: "course_name",
  "course name": "course_name",
  role: "account_role",
  account_role: "account_role",
  "account role": "account_role",
  status: "status",
  account_status: "status",
  "account status": "status",
};

export function mapHeader(raw: string): string | null {
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, "");
  return HEADER_ALIASES[key] ?? null;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let index = 0; index < src.length; index++) {
    const char = src[index]!;
    if (inQuotes) {
      if (char === '"') {
        if (src[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

export type ParsedStudentRow = {
  line: number;
  name: string;
  contact_number: string;
  login_number: string;
  tms_transaction_ids: string[];
  student_code: string | null;
  email: string | null;
  course_names: string[];
  account_role: "student" | "captain";
  status: "active" | "inactive";
  issue?: string;
};

export type CsvAnalysis = {
  detected: number;
  valid: ParsedStudentRow[];
  duplicates: ParsedStudentRow[];
  invalid: ParsedStudentRow[];
  unmappedHeaders: string[];
};

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type RawRow = {
  line: number;
  name: string;
  contact_number: string;
  login_number: string;
  tmsCandidates: string[];
  student_code: string | null;
  email: string | null;
  course_name: string | null;
  rawRole: string;
  rawStatus: string;
};

/**
 * The exported sheet has one row per *purchased course*, so the same
 * student (same login_number) can repeat several times with different
 * course_name values, and the TMS cell can hold more than one code
 * separated by commas. We parse every row first, then group by
 * login_number and merge before validating.
 */
export async function analyzeStudentCsv(text: string): Promise<CsvAnalysis> {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { detected: 0, valid: [], duplicates: [], invalid: [], unmappedHeaders: [] };
  }

  const headerRow = rows[0]!;
  const mappedHeaders = headerRow.map(mapHeader);
  const unmappedHeaders = headerRow.filter(
    (header, index) => header.trim() !== "" && mappedHeaders[index] === null,
  );

  const rawRows: RawRow[] = [];
  for (let index = 1; index < rows.length; index++) {
    const cells = rows[index]!;
    const record: Record<string, string> = {};
    mappedHeaders.forEach((key, cellIndex) => {
      if (key) record[key] = (cells[cellIndex] ?? "").trim();
    });

        const login_number = normalizeLoginNumber(
      record["login_number"] ?? record["contact_number"] ?? "",
    );
    const contact_number = normalizeContact(record["contact_number"] ?? "") || login_number;

    rawRows.push({
      line: index + 1,
      name: (record["name"] ?? "").trim(),
      contact_number,
      login_number,
      tmsCandidates: splitTmsField(record["tms_transaction_id"] ?? ""),
      student_code: (record["student_code"] ?? "").trim() || null,
      email: (record["email"] ?? "").trim() || null,
      course_name: (record["course_name"] ?? "").trim() || null,
      rawRole: (record["account_role"] ?? "student").trim().toLowerCase(),
      rawStatus: (record["status"] ?? "active").trim().toLowerCase(),
    });
  }

  // Group by login_number so repeated course rows for the same student merge into one entry.
  const groups = new Map<string, RawRow[]>();
  const ungrouped: RawRow[] = [];
  for (const row of rawRows) {
    if (row.login_number.length < 6) {
      ungrouped.push(row);
      continue;
    }
    const list = groups.get(row.login_number) ?? [];
    list.push(row);
    groups.set(row.login_number, list);
  }

  const { data: existingStudents } = await db.from("students").select("login_number");
  const existingLoginNumbers = new Set((existingStudents ?? []).map((s) => s.login_number));

  const valid: ParsedStudentRow[] = [];
  const duplicates: ParsedStudentRow[] = [];
  const invalid: ParsedStudentRow[] = [];

  for (const row of ungrouped) {
    invalid.push({
      line: row.line,
      name: row.name,
      contact_number: row.contact_number,
      login_number: row.login_number,
      tms_transaction_ids: [],
      student_code: row.student_code,
      email: row.email,
      course_names: row.course_name ? [row.course_name] : [],
      account_role: "student",
      status: "active",
      issue: "Invalid login number",
    });
  }

  for (const [login_number, groupRows] of groups) {
    const firstLine = groupRows[0]!.line;
    const name = groupRows.find((r) => r.name)?.name ?? "";

    const tmsSet = new Set<string>();
    const invalidTmsCodes: string[] = [];
    for (const row of groupRows) {
      for (const candidate of row.tmsCandidates) {
        if (isValidTmsTransactionId(candidate)) tmsSet.add(candidate);
        else invalidTmsCodes.push(candidate);
      }
    }
    const tms_transaction_ids = [...tmsSet];

    const course_names = [
      ...new Set(groupRows.map((r) => r.course_name).filter((c): c is string => !!c)),
    ];
    const emails = [...new Set(groupRows.map((r) => r.email).filter((e): e is string => !!e))];
    const roles = [...new Set(groupRows.map((r) => r.rawRole))];
    const statuses = [...new Set(groupRows.map((r) => r.rawStatus))];
    const student_code = groupRows.find((r) => r.student_code)?.student_code ?? null;
    const contact_number = groupRows.find((r) => r.contact_number)?.contact_number ?? login_number;

    const entryBase = {
      line: firstLine,
      name,
      contact_number,
      login_number,
      tms_transaction_ids,
      student_code,
      email: emails[0] ?? null,
      course_names,
      account_role: (roles.includes("captain") ? "captain" : "student") as "student" | "captain",
      status: (statuses.includes("inactive") ? "inactive" : "active") as "active" | "inactive",
    };

    if (!name) {
      invalid.push({ ...entryBase, issue: "Missing student name" });
      continue;
    }
    if (tms_transaction_ids.length === 0) {
      invalid.push({
        ...entryBase,
        issue: invalidTmsCodes.length
          ? `TMS ID must look like TMS44500684 (got "${invalidTmsCodes[0]}")`
          : "Missing TMS transaction ID",
      });
      continue;
    }
    if (emails.length > 1) {
      invalid.push({
        ...entryBase,
        issue: "Conflicting email addresses across rows for this student",
      });
      continue;
    }
    if (emails[0] && !validEmail(emails[0])) {
      invalid.push({ ...entryBase, issue: "Invalid email address" });
      continue;
    }
    if (roles.length > 1) {
      invalid.push({
        ...entryBase,
        issue: "Conflicting role (student/captain) across rows for this student",
      });
      continue;
    }

    if (existingLoginNumbers.has(login_number)) {
      duplicates.push({ ...entryBase, issue: "Student already exists and can be updated" });
      continue;
    }

    valid.push(entryBase);
  }

  return { detected: rawRows.length, valid, duplicates, invalid, unmappedHeaders };
}
