import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { Bell, LayoutDashboard, ScrollText, Settings, Table2, Users } from "lucide-react";

import { AppShell, type NavItem } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth.functions";

const nav: NavItem[] = [
  { to: "/staff", label: "সারসংক্ষেপ", icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: "/staff/tickets", label: "সমস্যা ওয়ার্কস্পেস", icon: <Table2 className="size-4" /> },
  { to: "/staff/students", label: "শিক্ষার্থী ডেটাবেজ", icon: <Users className="size-4" /> },
  { to: "/staff/notices", label: "নোটিশ", icon: <Bell className="size-4" /> },
  { to: "/staff/audit", label: "অ্যাক্টিভিটি লগ", icon: <ScrollText className="size-4" /> },
  { to: "/staff/settings", label: "সেটিংস", icon: <Settings className="size-4" /> },
];

export const Route = createFileRoute("/staff")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (user.role === "student") throw redirect({ to: "/student" });
    if (user.role !== "staff") throw redirect({ to: "/" });
    return { staff: user };
  },
  component: StaffLayout,
});

function StaffLayout() {
  const { staff } = Route.useRouteContext();
  return (
    <AppShell nav={nav} variant="staff" title={staff.username} subtitle="সাপোর্ট টিম">
      <Outlet />
    </AppShell>
  );
}
