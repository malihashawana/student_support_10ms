import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell, type NavItem } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth.functions";

const nav: NavItem[] = [{ to: "/captain", label: "ক্যাপ্টেন ড্যাশবোর্ড", icon: null, exact: true }];

export const Route = createFileRoute("/captain")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (user.role === "staff") throw redirect({ to: "/staff" });
    if (user.role !== "student") throw redirect({ to: "/" });
    if (user.account_role !== "captain") throw redirect({ to: "/student" });
    return { captain: user };
  },
  component: CaptainLayout,
});

function CaptainLayout() {
  const { captain } = Route.useRouteContext();
  return (
    <AppShell nav={nav} variant="student" title={captain.name} subtitle="ক্যাপ্টেন">
      <Outlet />
    </AppShell>
  );
}
