import { MessageReport } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";

/** The app's primary action: report a problem at a place on the map. */
export function ReportFab({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="lg" onClick={onClick} className="border-border-strong/50 bg-background pe-5 shadow-xs">
      <MessageReport data-icon="start" />
      Create a report
    </Button>
  );
}
