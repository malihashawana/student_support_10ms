import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getSettings, updateSetting, updateStaffCredentials } from "@/lib/staff.functions";

export const Route = createFileRoute("/staff/settings")({
  head: () => ({
    meta: [
      { title: "সাপোর্ট সেটিংস — Student Support Hub HSC 28" },
      {
        name: "description",
        content:
          "সমস্যার ক্যাটাগরি, কোর্স, আপলোড সীমা এবং সাপোর্ট টিমের ক্রেডেনশিয়াল পরিচালনা করুন।",
      },
      { property: "og:title", content: "সাপোর্ট সেটিংস — Student Support Hub HSC 28" },
      { property: "og:description", content: "ক্যাটাগরি, কোর্স ও ক্রেডেনশিয়াল কনফিগার করুন।" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const fetchSettings = useServerFn(getSettings);
  const save = useServerFn(updateSetting);
  const saveCredentials = useServerFn(updateStaffCredentials);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["staff-settings"],
    queryFn: () => fetchSettings(),
  });

  const [categories, setCategories] = useState<string | null>(null);
  const [courses, setCourses] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function saveList(key: "categories" | "courses", raw: string) {
    const value = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!value.length) {
      toast.error("অনুগ্রহ করে তালিকায় অন্তত একটি এন্ট্রি রাখুন।");
      return;
    }
    setBusy(true);
    try {
      await save({ data: { key, value } });
      toast.success("সেটিংস সংরক্ষণ করা হয়েছে।");
      void queryClient.invalidateQueries({ queryKey: ["staff-settings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "এই সেটিংস সংরক্ষণ করা যায়নি।");
    } finally {
      setBusy(false);
    }
  }

  async function saveCreds(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await saveCredentials({
        data: {
          currentPassword,
          ...(username.trim() ? { username: username.trim() } : {}),
          ...(newPassword ? { newPassword } : {}),
        },
      });
      toast.success("সাপোর্ট টিমের ক্রেডেনশিয়াল আপডেট করা হয়েছে।");
      setCurrentPassword("");
      setUsername("");
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ক্রেডেনশিয়াল আপডেট করা যায়নি।");
    } finally {
      setBusy(false);
    }
  }

  const categoriesText = categories ?? data.settings.categories.join("\n");
  const coursesText = courses ?? data.settings.courses.join("\n");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="সেটিংস"
        description={`লগইন করেছেন ${data.username} হিসেবে। পরিবর্তনগুলো পুরো সাপোর্ট হাবে প্রযোজ্য হবে।`}
      />

      <div className="card-panel p-5">
        <h2 className="font-display text-sm font-semibold">সমস্যার ক্যাটাগরি</h2>
        <p className="mt-1 text-xs text-muted-foreground">প্রতি লাইনে একটি ক্যাটাগরি।</p>
        <Textarea
          className="mt-3"
          rows={8}
          value={categoriesText}
          onChange={(e) => setCategories(e.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <Button size="sm" disabled={busy} onClick={() => saveList("categories", categoriesText)}>
            <Save className="size-4" />
            ক্যাটাগরি সংরক্ষণ করুন
          </Button>
        </div>
      </div>

      <div className="card-panel p-5">
        <h2 className="font-display text-sm font-semibold">কোর্স / বিষয়</h2>
        <p className="mt-1 text-xs text-muted-foreground">প্রতি লাইনে একটি কোর্স।</p>
        <Textarea
          className="mt-3"
          rows={8}
          value={coursesText}
          onChange={(e) => setCourses(e.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <Button size="sm" disabled={busy} onClick={() => saveList("courses", coursesText)}>
            <Save className="size-4" />
            কোর্স সংরক্ষণ করুন
          </Button>
        </div>
      </div>

      <div className="card-panel p-5">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
          <KeyRound className="size-4 text-primary" />
          সাপোর্ট টিম লগইন
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          শেয়ার করা সাপোর্ট টিমের ইউজারনেম বা পাসওয়ার্ড আপডেট করুন। শিক্ষার্থীরা এই অংশে কখনো
          প্রবেশ করতে পারবে না।
        </p>
        <form className="mt-4 space-y-3" onSubmit={saveCreds}>
          <div className="space-y-1.5">
            <Label htmlFor="current">বর্তমান পাসওয়ার্ড *</Label>
            <Input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-username">নতুন ইউজারনেম</Label>
              <Input
                id="new-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={data.username}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">নতুন পাসওয়ার্ড</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="কমপক্ষে ৮ অক্ষর"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              ক্রেডেনশিয়াল আপডেট করুন
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
