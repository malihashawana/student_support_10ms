import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { Bell, LayoutDashboard, Settings, Table2, Users } from "lucide-react";

import { AppShell, type NavItem } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth.functions";

const nav: NavItem[] = [
  { to: "/staff", label: "Overview", icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: "/staff/tickets", label: "Issue Workspace", icon: <Table2 className="size-4" /> },
  { to: "/staff/students", label: "Student Database", icon: <Users className="size-4" /> },
  { to: "/staff/notices", label: "Notices", icon: <Bell className="size-4" /> },
  { to: "/staff/settings", label: "Settings", icon: <Settings className="size-4" /> },
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
    <AppShell nav={nav} variant="staff" title={staff.username} subtitle="Support team">
      <Outlet />
    </AppShell>
  );
}
