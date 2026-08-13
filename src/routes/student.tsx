import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import {
  Bell,
  FilePlus2,
  LayoutDashboard,
  ListChecks,
  UserRound,
  Users,
} from "lucide-react";

import { AppShell, type NavItem } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth.functions";

const nav: NavItem[] = [
  { to: "/student", label: "Dashboard", icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: "/student/report", label: "Report a Problem", icon: <FilePlus2 className="size-4" /> },
  { to: "/student/issues", label: "My Issues", icon: <ListChecks className="size-4" /> },
  { to: "/student/community", label: "Community Issues", icon: <Users className="size-4" /> },
  { to: "/student/notices", label: "Notices", icon: <Bell className="size-4" /> },
  { to: "/student/profile", label: "Profile", icon: <UserRound className="size-4" /> },
];

export const Route = createFileRoute("/student")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (user.role === "staff") throw redirect({ to: "/staff" });
    if (user.role !== "student") throw redirect({ to: "/" });
    return { student: user };
  },
  component: StudentLayout,
});

function StudentLayout() {
  const { student } = Route.useRouteContext();
  return (
    <AppShell
      nav={nav}
      variant="student"
      title={student.name}
      subtitle={student.contact_number}
    >
      <Outlet />
    </AppShell>
  );
}
