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
      { title: "Sign in — Student Support Hub HSC 28" },
      {
        name: "description",
        content:
          "Sign in with your registered contact number to report and track HSC 28 study problems, or use the support team login.",
      },
      { property: "og:title", content: "Sign in — Student Support Hub HSC 28" },
      {
        property: "og:description",
        content: "Report a problem, track your tickets and see resolved issues for HSC 28.",
      },
    ],
  }),
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (user.role === "student") throw redirect({ to: "/student" });
    if (user.role === "staff") throw redirect({ to: "/staff" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [contact, setContact] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"student" | "staff" | null>(null);

  async function handleStudent(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy("student");
    try {
      await studentLogin({ data: { contact } });
      await router.invalidate();
      await navigate({ to: "/student", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
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
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
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
            <p className="font-display text-lg font-semibold">Student Support Hub</p>
            <p className="text-sm opacity-80">HSC 28</p>
          </div>
        </div>
        <div className="max-w-lg space-y-6">
          <h1 className="font-display text-4xl leading-tight font-semibold">
            One place for every HSC 28 problem — reported, tracked and resolved.
          </h1>
          <ul className="space-y-4 text-sm opacity-90">
            <li className="flex gap-3">
              <LifeBuoy className="mt-0.5 size-5 shrink-0" />
              Report class, exam, sound, video or payment problems in seconds.
            </li>
            <li className="flex gap-3">
              <Search className="mt-0.5 size-5 shrink-0" />
              Search issues other students already reported before opening a new one.
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0" />
              Your identity stays private on the community issue board.
            </li>
          </ul>
        </div>
        <p className="text-xs opacity-70">Central issue database & resolution system</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground">
              <GraduationCap className="size-5" />
            </span>
            <div>
              <p className="font-display font-semibold">Student Support Hub</p>
              <p className="text-xs text-muted-foreground">HSC 28</p>
            </div>
          </div>

          <h2 className="font-display text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Students sign in with their registered contact number.
          </p>

          <Tabs defaultValue="student" onValueChange={() => setError(null)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="staff">Support Team</TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="mt-6">
              <form onSubmit={handleStudent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact">Contact / Login Number</Label>
                  <Input
                    id="contact"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="01XXXXXXXXX"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    maxLength={20}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the number registered with your HSC 28 course.
                  </p>
                </div>
                {error ? (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={busy === "student"}>
                  {busy === "student" ? <Loader2 className="size-4 animate-spin" /> : null}
                  Continue
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="staff" className="mt-6">
              <form onSubmit={handleStaff} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
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
                  Support Team Login
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
