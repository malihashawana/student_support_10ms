import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import {
  Bell,
  FilePlus2,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { AppShell, type NavItem } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth.functions";

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
  const isCaptain = student.account_role === "captain";

  const nav: NavItem[] = [
    isCaptain
      ? { to: "/captain", label: "ক্যাপ্টেন ড্যাশবোর্ড", icon: <ShieldCheck className="size-4" /> }
      : {
          to: "/student",
          label: "ড্যাশবোর্ড",
          icon: <LayoutDashboard className="size-4" />,
          exact: true,
        },
    {
      to: "/student/report",
      label: isCaptain ? "প্রায়োরিটি সমস্যা জানান" : "সমস্যা জানান",
      icon: <FilePlus2 className="size-4" />,
    },
    { to: "/student/issues", label: "আমার সমস্যা", icon: <ListChecks className="size-4" /> },
    { to: "/student/community", label: "সবার সমস্যা", icon: <Users className="size-4" /> },
    { to: "/student/notices", label: "নোটিশ", icon: <Bell className="size-4" /> },
    { to: "/student/profile", label: "প্রোফাইল", icon: <UserRound className="size-4" /> },
  ];

  return (
    <AppShell
      nav={nav}
      variant="student"
      title={student.name}
      subtitle={isCaptain ? `ক্যাপ্টেন · ${student.contact_number}` : student.contact_number}
    >
      <Outlet />
    </AppShell>
  );
}
