import { Refresh } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { useNow } from "@/shared/hooks/use-now";

type FreshnessStatusProps = { updatedAt: number | null; onRetry: () => void };

/** Shown after a failed refresh: how old the data on screen is, and a retry. */
export function FreshnessStatus({ updatedAt, onRetry }: FreshnessStatusProps) {
  const now = useNow(1_000);
  const seconds = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;
  const age = seconds === null ? "earlier" : seconds < 60 ? `${seconds} s ago` : `${Math.round(seconds / 60)} min ago`;
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
