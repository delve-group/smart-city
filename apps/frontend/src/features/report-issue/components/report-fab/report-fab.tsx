import { MessageReport } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";

/** The app's primary action: report a problem at a place on the map. */
export function ReportFab({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <Button
      variant={active ? "primary" : "outline"}
      size="lg"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 shadow-xs ${active ? "" : "border-border-strong/50 bg-background"}`}
    >
      <MessageReport data-icon="start" />
      Report
    </Button>
  );
}
