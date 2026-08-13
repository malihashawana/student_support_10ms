import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "open" | "review" | "waiting" | "resolved" | "closed";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    default: "text-primary bg-primary/10",
    open: "text-status-open bg-status-open/10",
    review: "text-status-review bg-status-review/10",
    waiting: "text-status-waiting bg-status-waiting/10",
    resolved: "text-status-resolved bg-status-resolved/10",
    closed: "text-status-closed bg-status-closed/10",
  };
  return (
    <div className="card-panel flex items-center gap-4 p-4">
      {icon ? (
        <div className={cn("flex size-10 items-center justify-center rounded-xl", tones[tone])}>
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="font-display text-2xl font-semibold">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
