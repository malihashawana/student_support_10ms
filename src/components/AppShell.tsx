import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { GraduationCap, LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth.functions";
import { cn } from "@/lib/utils";

export type NavItem = { to: string; label: string; icon: ReactNode; exact?: boolean };

export function AppShell({
  nav,
  variant,
  title,
  subtitle,
  children,
}: {
  nav: NavItem[];
  variant: "student" | "staff";
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  async function signOut() {
    try {
      await logout();
      await router.invalidate();
      await navigate({ to: "/", replace: true });
    } catch {
      toast.error("সাইন আউট করা যায়নি। আবার চেষ্টা করুন।");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4">
          <button
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="মেনু খুলুন বা বন্ধ করুন"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link
            to={(variant === "staff" ? "/staff" : "/student") as never}
            className="group flex items-center gap-3"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-sm transition-transform group-hover:scale-105">
              <GraduationCap className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="font-display block text-sm font-semibold">
                স্টুডেন্ট সাপোর্ট হাব
              </span>
              <span className="block text-xs text-muted-foreground">এইচএসসি ২৮</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">লগআউট</span>
            </Button>
          </div>
        </div>
        <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary/30 to-transparent" />
      </header>

      <div className="mx-auto flex max-w-[1500px] gap-6 px-4 py-6">
        <aside
          className={cn(
            "fixed inset-x-0 top-16 z-20 border-b border-white/10 bg-[#2a0a12] p-3 lg:static lg:block lg:w-60 lg:shrink-0 lg:rounded-2xl lg:border lg:border-white/10 lg:bg-[#2a0a12] lg:p-3 lg:shadow-xl",
            open ? "block" : "hidden",
          )}
        >
          <nav className="flex flex-col gap-1 lg:sticky lg:top-24">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to as never}
                activeOptions={{ exact: item.exact ?? false }}
                onClick={() => setOpen(false)}
                className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-200/60 transition-all before:absolute before:left-0 before:top-1/2 before:h-0 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-primary before:content-[''] before:transition-all before:duration-300 hover:bg-white/10 hover:text-white"
                activeProps={{
                  className:
                    "bg-red-600 text-white shadow-lg shadow-red-950/50 before:h-2/3 hover:bg-red-500 hover:text-white",
                }}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5 transition-colors group-hover:bg-white/15">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}