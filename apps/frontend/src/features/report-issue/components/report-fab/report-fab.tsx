import { MessageReport } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";

/** The app's primary action: report a problem at a place on the map. */
export function ReportFab({ onClick }: { onClick: () => void }) {
  return (
    <Button size="lg" onClick={onClick} className="pe-5 shadow-md">
      <MessageReport data-icon="start" />
      Report an issue
    </Button>
  );
}
