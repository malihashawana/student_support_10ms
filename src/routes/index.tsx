import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import {
  GraduationCap,
  Loader2,
  LifeBuoy,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  ClipboardCheck,
  UserPlus,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/language-context";

import { Button } from "@/components/ui/button";
import type { AcademicBatch, AcademicGroup } from "@/lib/academic-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NEEDS_SETUP_MESSAGE,
  getCurrentUser,
  registerStudent,
  staffLogin,
  studentLogin,
} from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "লগইন - স্টুডেন্ট সাপোর্ট হাব এইচএসসি ২৭ ও ২৮" },
      {
        name: "description",
        content:
          "লগইন নম্বর ও পাসওয়ার্ড দিয়ে লগইন করে এইচএসসি ২৭ ও ২৮ কোর্সের যেকোনো সমস্যা জানিয়ে সমাধান পাও।",
      },
      { property: "og:title", content: "লগইন — স্টুডেন্ট সাপোর্ট হাব এইচএসসি ২৭ ও ২৮" },
      {
        property: "og:description",
        content: "নিজের সমস্যা জানাও এবং সমাধানের অগ্রগতি দেখো।",
      },
    ],
  }),
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (user.role === "student" && user.account_role === "captain")
      throw redirect({ to: "/captain" });
    if (user.role === "student") throw redirect({ to: "/student" });
    if (user.role === "staff") throw redirect({ to: "/staff" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const [mode, setMode] = useState<"login" | "register">("login");

  // Unified login fields (student login number OR staff username)
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration fields (students only)
  const [regLoginNumber, setRegLoginNumber] = useState("");
  const [regTmsId, setRegTmsId] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regAcademicBatch, setRegAcademicBatch] = useState<AcademicBatch | "">("");
  const [regAcademicGroup, setRegAcademicGroup] = useState<AcademicGroup | "">("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"login" | "register" | null>(null);

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy("login");

    // 1) Try as a student login (identifier = login number)
    try {
      await studentLogin({
        data: { login_number: identifier, password: loginPassword },
      });
      await router.invalidate();
      await navigate({ to: "/student", replace: true });
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === NEEDS_SETUP_MESSAGE) {
        setMode("register");
        setRegLoginNumber(identifier);
        setNotice(
          t("এই লগইন নম্বরের জন্য এখনো পাসওয়ার্ড সেট করা হয়নি। নিচে TMS ট্রানজেকশন আইডি ও নতুন পাসওয়ার্ড দিয়ে সম্পন্ন করো।", "No password has been set for this login number. Complete registration below using your TMS transaction ID and a new password."),
        );
        setBusy(null);
        return;
      }
      // Not a recognized student login — fall through and try staff login below.
    }

    // 2) Try as a support-team (staff) login (identifier = username)
    try {
      await staffLogin({ data: { username: identifier, password: loginPassword } });
      await router.invalidate();
      await navigate({ to: "/staff", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("লগইন করা যায়নি। আবার চেষ্টা করো।", "Could not log in. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!regAcademicBatch || !regAcademicGroup) {
      setError(t("ব্যাচ এবং বিভাগ নির্বাচন করুন।", "Please select your batch and academic group."));
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError(t("পাসওয়ার্ড দুটি মিলছে না।", "The passwords do not match."));
      return;
    }
    setBusy("register");
    try {
      const trimmedEmail = regEmail.trim();
      await registerStudent({
        data: {
          login_number: regLoginNumber,
          tms_transaction_id: regTmsId,
          name: regName,
          ...(trimmedEmail ? { email: trimmedEmail } : {}),
          password: regPassword,
          academic_batch: regAcademicBatch,
          academic_group: regAcademicGroup,
        },
      });
      await router.invalidate();
      await navigate({ to: "/student", replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("রেজিস্ট্রেশন সম্পন্ন করা যায়নি। আবার চেষ্টা করো।", "Could not complete registration. Please try again."),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      <div className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex w-full max-w-[1216px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#931212] text-white">
              <GraduationCap className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base font-bold sm:text-lg">{t("স্টুডেন্ট সাপোর্ট হাব", "Student Support Hub")}</p>
              <p className="text-xs text-[#6B7280]">10 Minute School · HSC 27 & 28</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-1" role="group" aria-label="Language">
              <button type="button" onClick={() => setLanguage("bn")} aria-pressed={language === "bn"} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${language === "bn" ? "bg-white text-[#931212] shadow-sm" : "text-[#6B7280]"}`}>বাংলা</button>
              <button type="button" onClick={() => setLanguage("en")} aria-pressed={language === "en"} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${language === "en" ? "bg-white text-[#931212] shadow-sm" : "text-[#6B7280]"}`}>EN</button>
            </div>
          <span className="hidden rounded-full border border-[#F4C6CC] bg-[#FFF5F6] px-3 py-1.5 text-xs font-semibold text-[#931212] sm:inline-flex">
            {t("শিক্ষার্থীদের জন্য সাপোর্ট", "Support for Students")}
          </span>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1216px] items-start gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] lg:gap-14 lg:py-20">
        <section className="order-2 space-y-7 lg:order-1 lg:pt-9">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#F4C6CC] bg-[#FFF5F6] px-3 py-2 text-xs font-bold text-[#931212]">
            <span className="size-2 rounded-full bg-[#E8001D]" />
            {t("HSC 27 ও HSC 28 অনলাইন ব্যাচ", "HSC 27 & HSC 28 Online Batch")}
          </span>
          <div className="space-y-4">
            <h1 className="max-w-2xl font-display text-3xl font-bold leading-[1.4] tracking-normal sm:text-4xl lg:text-[44px]">
              {language === "bn" ? (<>তোমার সমস্যার <span className="text-[#931212]">সমাধান</span> এখন আরও সহজ</>) : (<>Your problems, <span className="text-[#931212]">solved</span> more easily</>)}
            </h1>
            <p className="max-w-xl text-base leading-8 text-[#4B5563]">
              {t("ক্লাস, পরীক্ষা, ভিডিও বা কোর্স সংক্রান্ত সমস্যা জানাও। নিজের টিকিটের অগ্রগতি দেখো এবং সাপোর্ট টিমের আপডেট পাও এক জায়গায়।", "Report issues with classes, exams, videos, or courses. Track your tickets and get support team updates in one place.")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: LifeBuoy, title: t("সমস্যা জানাও", "Report an Issue"), desc: t("নতুন সাপোর্ট টিকিট তৈরি করো", "Create a new support ticket"), tint: "bg-[#D8F3FF]", color: "text-[#274FE3]" },
              { icon: ClipboardCheck, title: t("অগ্রগতি দেখো", "Track Progress"), desc: t("নিজের টিকিটের স্ট্যাটাস দেখো", "Check your ticket status"), tint: "bg-[#CCEBC0]", color: "text-[#0E7B4F]" },
              { icon: ShieldCheck, title: t("নিরাপদ সাপোর্ট", "Secure Support"), desc: t("তোমার তথ্য ব্যক্তিগত থাকবে", "Your information stays private"), tint: "bg-[#FFF5D6]", color: "text-[#A23F00]" },
            ].map(({ icon: Icon, title, desc, tint, color }) => (
              <div key={title} className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                <span className={`mb-4 flex size-10 items-center justify-center rounded-xl ${tint} ${color}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mb-1 text-sm font-bold">{title}</h3>
                <p className="text-xs leading-5 text-[#6B7280]">{desc}</p>
              </div>
            ))}
          </div>
          <p className="flex items-center gap-2 text-xs text-[#6B7280]">
            <LockKeyhole className="size-4" aria-hidden="true" />
            {t("তোমার অ্যাকাউন্ট ও সাপোর্ট টিকিটের তথ্য সুরক্ষিত রাখার জন্য তৈরি।", "Designed to keep your account and support ticket information secure.")}
          </p>
        </section>

        <section className="order-1 lg:order-2" aria-label={t("লগইন ও রেজিস্ট্রেশন", "Login and registration")}>
          <div className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-[0_4px_20px_rgba(17,24,39,0.05)]">
            <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-7">
              <div className="mb-5 flex items-center gap-2 text-xs font-bold text-[#0E7B4F]">
                <CheckCircle2 className="size-4" /> {t("শিক্ষার্থী ও সাপোর্ট টিম", "Students & Support Team")}
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F3F4F6] p-1" role="tablist" aria-label={t("অ্যাকাউন্ট", "Account")}>
                <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => switchMode("login")}
                  className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8001D] ${mode === "login" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"}`}>
                  {t("লগইন", "Login")}
                </button>
                <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => switchMode("register")}
                  className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8001D] ${mode === "register" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"}`}>
                  {t("রেজিস্ট্রেশন", "Register")}
                </button>
              </div>
            </div>
            <div className="px-5 py-7 sm:px-7">
              {mode === "login" ? (
                <>
                  <h2 className="font-display text-2xl font-bold">{t("তোমার অ্যাকাউন্টে লগইন করো", "Log in to your account")}</h2>
                  <p className="mb-6 mt-2 text-sm text-[#6B7280]">{t("শিক্ষার্থী লগইন নম্বর অথবা সাপোর্ট টিমের ইউজারনেম ব্যবহার করো।", "Use your student login number or support team username.")}</p>
                  {notice && <p role="status" className="mb-4 rounded-lg border border-[#BBE7C9] bg-[#F0FBF4] px-3 py-2 text-sm text-[#0E7B4F]">{notice}</p>}
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-identifier">{t("ইউজারনেম / লগইন নম্বর", "Username / Login Number")}</Label>
                      <Input id="login-identifier" autoComplete="username" placeholder="01XXXXXXXXX" value={identifier} onChange={(e) => setIdentifier(e.target.value)} maxLength={40} required className="min-h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">{t("পাসওয়ার্ড", "Password")}</Label>
                      <Input id="login-password" type="password" autoComplete="current-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="min-h-11" />
                    </div>
                    {error && <p role="alert" className="rounded-lg border border-[#F4C6CC] bg-[#FFF5F6] px-3 py-2 text-sm text-[#931212]">{error}</p>}
                    <Button type="submit" className="min-h-11 w-full font-bold" disabled={busy !== null}>
                      {busy === "login" ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                      {t("লগইন করো", "Log In")}
                    </Button>
                    <button type="button" onClick={() => switchMode("register")} className="min-h-11 w-full text-center text-sm font-semibold text-[#931212] hover:underline">
                      {t("নতুন শিক্ষার্থী? রেজিস্ট্রেশন করো", "New student? Register here")}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h2 className="font-display text-2xl font-bold">{t("শিক্ষার্থী রেজিস্ট্রেশন", "Student Registration")}</h2>
                  <p className="mb-6 mt-2 text-sm text-[#6B7280]">{t("তোমার কোর্সের তথ্য দিয়ে অ্যাকাউন্ট তৈরি করো।", "Create an account using your course information.")}</p>
                  {notice && <p role="status" className="mb-4 rounded-lg border border-[#BBE7C9] bg-[#F0FBF4] px-3 py-2 text-sm text-[#0E7B4F]">{notice}</p>}
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="reg-login-number">{t("লগইন নম্বর", "Login Number")}</Label><Input id="reg-login-number" inputMode="numeric" autoComplete="username" placeholder="01XXXXXXXXX" value={regLoginNumber} onChange={(e) => setRegLoginNumber(e.target.value)} maxLength={20} required className="min-h-11" /></div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-tms-id">{t("TMS ট্রানজেকশন আইডি", "TMS Transaction ID")}</Label>
                      <Input id="reg-tms-id" autoComplete="off" placeholder="TMS12345678" value={regTmsId} onChange={(e) => setRegTmsId(e.target.value)} maxLength={40} required className="min-h-11" />
                      <p className="text-xs text-[#6B7280]">{t("কোর্স কেনার সময় পাওয়া TMS ট্রানজেকশন আইডিটি দাও।", "Enter the TMS transaction ID from your course purchase.")}</p>
                    </div>
                    <div className="space-y-2"><Label htmlFor="reg-name">{t("নাম", "Name")}</Label><Input id="reg-name" autoComplete="name" placeholder={t("তোমার পূর্ণ নাম", "Your full name")} value={regName} onChange={(e) => setRegName(e.target.value)} maxLength={100} required className="min-h-11" /></div>
                    <div className="space-y-2"><Label htmlFor="reg-email">{t("ইমেইল (ঐচ্ছিক)", "Email (optional)")}</Label><Input id="reg-email" type="email" autoComplete="email" placeholder="name@example.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="min-h-11" /></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label htmlFor="reg-academic-batch">{t("এইচএসসি ব্যাচ", "HSC Batch")}</Label>
                        <select id="reg-academic-batch" value={regAcademicBatch} onChange={(event) => setRegAcademicBatch(event.target.value as AcademicBatch | "")} required className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <option value="">{t("ব্যাচ নির্বাচন করো", "Select batch")}</option><option value="hsc_27">HSC 27</option><option value="hsc_28">HSC 28</option>
                        </select>
                      </div>
                      <div className="space-y-2"><Label htmlFor="reg-academic-group">{t("বিভাগ", "Academic Group")}</Label>
                        <select id="reg-academic-group" value={regAcademicGroup} onChange={(event) => setRegAcademicGroup(event.target.value as AcademicGroup | "")} required className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <option value="">{t("বিভাগ নির্বাচন করো", "Select group")}</option><option value="science">{t("বিজ্ঞান", "Science")}</option><option value="business_studies">{t("ব্যবসায় শিক্ষা", "Business Studies")}</option><option value="humanities">{t("মানবিক", "Humanities")}</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="reg-password">{t("পাসওয়ার্ড", "Password")}</Label><Input id="reg-password" type="password" autoComplete="new-password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} minLength={6} required className="min-h-11" /></div>
                    <div className="space-y-2"><Label htmlFor="reg-confirm-password">{t("পাসওয়ার্ড আবার লিখো", "Confirm Password")}</Label><Input id="reg-confirm-password" type="password" autoComplete="new-password" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} minLength={6} required className="min-h-11" /></div>
                    {error && <p role="alert" className="rounded-lg border border-[#F4C6CC] bg-[#FFF5F6] px-3 py-2 text-sm text-[#931212]">{error}</p>}
                    <Button type="submit" className="min-h-11 w-full font-bold" disabled={busy !== null}>
                      {busy === "register" ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                      {t("রেজিস্ট্রেশন সম্পন্ন করো", "Complete Registration")}
                    </Button>
                    <button type="button" onClick={() => switchMode("login")} className="min-h-11 w-full text-center text-sm font-semibold text-[#931212] hover:underline">
                      {t("আগে থেকেই অ্যাকাউন্ট আছে? লগইন করো", "Already have an account? Log in")}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
      <footer className="border-t border-[#E5E7EB] bg-white px-4 py-5 text-center text-xs text-[#6B7280]">
        10 Minute School · Student Support Hub · HSC 27 & 28
      </footer>
    </main>
  );
}
