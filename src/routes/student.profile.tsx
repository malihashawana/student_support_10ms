import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { studentDashboard } from "@/lib/student.functions";

export const Route = createFileRoute("/student/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Student Support Hub HSC 28" },
      {
        name: "description",
        content: "Your registered HSC 28 student details and reporting summary.",
      },
      { property: "og:title", content: "My Profile — Student Support Hub HSC 28" },
      { property: "og:description", content: "Registered student details and ticket summary." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { student } = Route.useRouteContext();
  const fetchDashboard = useServerFn(studentDashboard);
  const { data } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  const rows: Array<[string, string]> = [
    ["Name", student.name],
    ["Contact number", student.contact_number],
    ["Student ID", student.student_code || "—"],
    ["Total issues reported", String(data?.stats.total ?? 0)],
    ["Open issues", String(data?.stats.open ?? 0)],
    ["Resolved issues", String(data?.stats.resolved ?? 0)],
  ];

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="My Profile" description="Details registered by the support team." />
      <div className="card-panel divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-start gap-2 rounded-lg bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        Your name and contact number are never shown on the community board. To change these
        details, contact the support team.
      </p>
    </div>
  );
}
