import { MessageReport } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";

/** The app's primary action: report a problem at a place on the map. */
export function ReportFab({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="lg" onClick={onClick} className="shrink-0 border-border-strong/50 bg-background shadow-xs">
      <MessageReport data-icon="start" />
      Report
    </Button>
  );
}
