import { Refresh } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { useNow } from "@/shared/hooks/use-now";

type FreshnessStatusProps = { updatedAt: number | null; failed: boolean; onRetry: () => void };

/** "Live" while refreshes succeed; after a failure, says how old the data on screen is. */
export function FreshnessStatus({ updatedAt, failed, onRetry }: FreshnessStatusProps) {
  const now = useNow(1_000);
  const seconds = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;
  const age = seconds === null ? "not loaded" : seconds < 60 ? `${seconds} s ago` : `${Math.round(seconds / 60)} min ago`;

  if (failed) {
    return (
      <div role="status" className="flex items-center justify-between gap-2 text-xs text-warning">
        <span>Can’t refresh · data from {age}</span>
        <Button variant="ghost" size="sm" onClick={onRetry} className="h-7 px-2">
          <Refresh data-icon="start" />
          Retry
        </Button>
      </div>
    );
  }
  return (
    <p className="flex items-center gap-2 text-xs text-foreground-muted">
      <span aria-hidden className="size-1.5 rounded-full bg-success" />
      Live · updated {age}
    </p>
  );
}
