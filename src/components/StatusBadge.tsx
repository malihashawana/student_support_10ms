import { STATUS_STYLES, labelPriority, labelStatus } from "@/lib/support-constants";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
  short,
}: {
  status: string;
  className?: string;
  short?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {labelStatus(status, short)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const key = (priority ?? "").toLowerCase();
  const styles: Record<string, string> = {
    urgent: "border-destructive/30 bg-destructive/15 text-destructive",
    high: "border-status-waiting/30 bg-status-waiting/15 text-status-waiting",
    normal: "border-status-open/30 bg-status-open/15 text-status-open",
    low: "border-border bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[key] ?? styles["normal"],
      )}
    >
      {labelPriority(priority)}
    </span>
  );
}
