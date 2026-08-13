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
      { title: "Support Settings — Student Support Hub HSC 28" },
      {
        name: "description",
        content: "Manage problem categories, courses, upload limits and support team credentials.",
      },
      { property: "og:title", content: "Support Settings — Student Support Hub HSC 28" },
      { property: "og:description", content: "Configure categories, courses and credentials." },
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
      toast.error("Please keep at least one entry in the list.");
      return;
    }
    setBusy(true);
    try {
      await save({ data: { key, value } });
      toast.success("Settings saved.");
      void queryClient.invalidateQueries({ queryKey: ["staff-settings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't save these settings.");
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
      toast.success("Support team credentials updated.");
      setCurrentPassword("");
      setUsername("");
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't update the credentials.");
    } finally {
      setBusy(false);
    }
  }

  const categoriesText = categories ?? data.settings.categories.join("\n");
  const coursesText = courses ?? data.settings.courses.join("\n");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description={`Signed in as ${data.username}. Changes apply to the whole support hub.`}
      />

      <div className="card-panel p-5">
        <h2 className="font-display text-sm font-semibold">Problem categories</h2>
        <p className="mt-1 text-xs text-muted-foreground">One category per line.</p>
        <Textarea
          className="mt-3"
          rows={8}
          value={categoriesText}
          onChange={(e) => setCategories(e.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <Button size="sm" disabled={busy} onClick={() => saveList("categories", categoriesText)}>
            <Save className="size-4" />
            Save categories
          </Button>
        </div>
      </div>

      <div className="card-panel p-5">
        <h2 className="font-display text-sm font-semibold">Courses / subjects</h2>
        <p className="mt-1 text-xs text-muted-foreground">One course per line.</p>
        <Textarea
          className="mt-3"
          rows={8}
          value={coursesText}
          onChange={(e) => setCourses(e.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <Button size="sm" disabled={busy} onClick={() => saveList("courses", coursesText)}>
            <Save className="size-4" />
            Save courses
          </Button>
        </div>
      </div>

      <div className="card-panel p-5">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
          <KeyRound className="size-4 text-primary" />
          Support team login
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Update the shared support team username or password. Students can never reach this area.
        </p>
        <form className="mt-4 space-y-3" onSubmit={saveCreds}>
          <div className="space-y-1.5">
            <Label htmlFor="current">Current password *</Label>
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
              <Label htmlFor="new-username">New username</Label>
              <Input
                id="new-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={data.username}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Update credentials
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
