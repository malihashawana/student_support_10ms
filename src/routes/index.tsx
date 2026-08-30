import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { GraduationCap, Headset, LifeBuoy, Loader2, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser, staffLogin, studentLogin } from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "লগইন — স্টুডেন্ট সাপোর্ট হাব এইচএসসি ২৮" },
      {
        name: "description",
        content:
          "লগইন নম্বর ও TMS ট্রানজেকশন আইডি দিয়ে লগইন করে এইচএসসি ২৮ কোর্সের যেকোনো সমস্যা জানান ও সমাধান ট্র্যাক করুন।",
      },
      { property: "og:title", content: "লগইন — স্টুডেন্ট সাপোর্ট হাব এইচএসসি ২৮" },
      {
        property: "og:description",
        content: "সমস্যা জানান, অবস্থা দেখুন এবং সমাধান হওয়া সমস্যাগুলো খুঁজুন।",
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
  const [loginNumber, setLoginNumber] = useState("");
  const [tmsId, setTmsId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"student" | "staff" | null>(null);

  async function handleStudent(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy("student");
    try {
      await studentLogin({
        data: {
          login_number: loginNumber,
          tms_transaction_id: tmsId,
          email: email.trim() || undefined,
        },
      });
      await router.invalidate();
      await navigate({ to: "/student", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "লগইন করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(null);
    }
  }

  async function handleStaff(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy("staff");
    try {
      await staffLogin({ data: { username, password } });
      await router.invalidate();
      await navigate({ to: "/staff", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "লগইন করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between bg-gradient-brand p-10 text-brand-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-foreground/15">
            <GraduationCap className="size-6" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">স্টুডেন্ট সাপোর্ট হাব</p>
            <p className="text-sm opacity-80">এইচএসসি ২৮</p>
          </div>
        </div>
        <div className="max-w-lg space-y-6">
          <h1 className="font-display text-4xl leading-tight font-semibold">
            এইচএসসি ২৮-এর সব সমস্যার এক ঠিকানা — জানান, ট্র্যাক করুন, সমাধান পান।
          </h1>
          <ul className="space-y-4 text-sm opacity-90">
            <li className="flex gap-3">
              <LifeBuoy className="mt-0.5 size-5 shrink-0" />
              ক্লাস, পরীক্ষা, সাউন্ড, ভিডিও বা পেমেন্টের সমস্যা মাত্র কয়েক সেকেন্ডে জানান।
            </li>
            <li className="flex gap-3">
              <Search className="mt-0.5 size-5 shrink-0" />
              নতুন রিপোর্ট করার আগে অন্য শিক্ষার্থীদের জানানো সমস্যাগুলো খুঁজে দেখুন।
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0" />
              সবার সমস্যার বোর্ডে আপনার পরিচয় গোপন থাকে।
            </li>
          </ul>
        </div>
        <p className="text-xs opacity-70">কেন্দ্রীয় সমস্যা ডেটাবেজ ও সমাধান ব্যবস্থা</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground">
              <GraduationCap className="size-5" />
            </span>
            <div>
              <p className="font-display font-semibold">স্টুডেন্ট সাপোর্ট হাব</p>
              <p className="text-xs text-muted-foreground">এইচএসসি ২৮</p>
            </div>
          </div>

          <h2 className="font-display text-2xl font-semibold">লগইন করুন</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            শিক্ষার্থীরা লগইন নম্বর ও TMS ট্রানজেকশন আইডি দিয়ে লগইন করবে।
          </p>

          <Tabs defaultValue="student" onValueChange={() => setError(null)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">শিক্ষার্থী</TabsTrigger>
              <TabsTrigger value="staff">সাপোর্ট টিম</TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="mt-6">
              <form onSubmit={handleStudent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-number">লগইন নম্বর</Label>
                  <Input
                    id="login-number"
                    inputMode="numeric"
                    autoComplete="username"
                    placeholder="01XXXXXXXXX"
                    value={loginNumber}
                    onChange={(e) => setLoginNumber(e.target.value)}
                    maxLength={20}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tms-id">TMS ট্রানজেকশন আইডি</Label>
                  <Input
                    id="tms-id"
                    autoComplete="off"
                    placeholder="TMS12345678"
                    value={tmsId}
                    onChange={(e) => setTmsId(e.target.value)}
                    maxLength={40}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    কোর্স কেনার সময় পাওয়া TMS ট্রানজেকশন আইডিটি দিন।
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">ইমেইল (ঐচ্ছিক)</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="আপনার রেজিস্টার্ড ইমেইল থাকলে দিন"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error ? (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={busy === "student"}>
                  {busy === "student" ? <Loader2 className="size-4 animate-spin" /> : null}
                  লগইন করুন
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="staff" className="mt-6">
              <form onSubmit={handleStaff} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">ইউজারনেম</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">পাসওয়ার্ড</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error ? (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={busy === "staff"}>
                  {busy === "staff" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Headset className="size-4" />
                  )}
                  সাপোর্ট টিম লগইন
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
