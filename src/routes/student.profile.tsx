import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { studentDashboard } from "@/lib/student.functions";
import { bn } from "@/lib/support-constants";

export const Route = createFileRoute("/student/profile")({
  head: () => ({
    meta: [
      { title: "প্রোফাইল — স্টুডেন্ট সাপোর্ট হাব HSC 28" },
      {
        name: "description",
        content: "তোমার নিবন্ধিত HSC 28 শিক্ষার্থী তথ্য ও রিপোর্টের সারাংশ।",
      },
      { property: "og:title", content: "প্রোফাইল — স্টুডেন্ট সাপোর্ট হাব HSC 28" },
      { property: "og:description", content: "নিবন্ধিত শিক্ষার্থীর তথ্য ও টিকিট সারাংশ।" },
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
    ["নাম", student.name],
    ["যোগাযোগ নম্বর", bn(student.contact_number)],
    ["শিক্ষার্থী আইডি", student.student_code ? bn(student.student_code) : "—"],
    ["মোট সমস্যা জানানো হয়েছে", bn(data?.stats.total ?? 0)],
    ["চলমান সমস্যা", bn(data?.stats.open ?? 0)],
    ["সমাধান হয়েছে", bn(data?.stats.resolved ?? 0)],
  ];

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="প্রোফাইল" description="সাপোর্ট টিমের দেওয়া তথ্য।" />
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
        তোমার নাম ও যোগাযোগ নম্বর কখনো সবার সমস্যা বোর্ডে দেখানো হয় না। এই তথ্য পরিবর্তন করতে
        সাপোর্ট টিমের সাথে যোগাযোগ করো।
      </p>
    </div>
  );
}
