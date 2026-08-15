import { useSession } from "@tanstack/react-start/server";

export type SupportSession = {
  role?: "student" | "staff";
  studentId?: string;
  staffId?: string;
  username?: string;
};

function sessionConfig() {
  const password = process.env["SESSION_SECRET"];
  if (!password) throw new Error("SESSION_SECRET is not configured");
  return {
    password,
    name: "hsc28-support-session",
    maxAge: 60 * 60 * 24 * 7,
    // The app is often viewed inside an embedded preview frame, so the session
    // cookie must be allowed in a cross-site context.
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
    },
  };
}

export async function getSupportSession() {
  return useSession<SupportSession>(sessionConfig());
}

/**
 * Friendly, non-technical errors only — never leak internals to users.
 * Must be a plain `Error`: custom Error subclasses cannot be serialized
 * back to the client by server functions and surface as a blank 500 page.
 */
export function friendly(message: string): Error {
  return new Error(message);
}


export async function readSession(): Promise<SupportSession> {
  const session = await getSupportSession();
  return session.data ?? {};
}

export async function requireStudent() {
  const data = await readSession();
  if (data.role !== "student" || !data.studentId) {
    throw friendly("আপনার সেশনের সময় শেষ হয়েছে। আবার লগইন করুন।");
  }
  return { studentId: data.studentId };
}

/**
 * Server-side staff authorization. Do not remove — every support-only
 * server function must pass through this check.
 */
export async function requireStaff() {
  const data = await readSession();
  if (data.role !== "staff" || !data.staffId) {
    throw friendly("এই পেজে প্রবেশের অনুমতি আপনার নেই। সাপোর্ট টিম হিসেবে লগইন করুন।");
  }
  return { staffId: data.staffId, username: data.username ?? "Support Team" };
}

const ITERATIONS = 100_000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function pbkdf2(password: string, salt: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const computed = await pbkdf2(password, parts[2]!, iterations);
  const expected = parts[3]!;
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
