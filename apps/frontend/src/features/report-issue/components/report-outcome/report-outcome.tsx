import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import type { Report } from "@/api/intake/types";

export function ReportOutcome({ report, busy, onRefresh, onNew }: { report: Pick<Report, "reference" | "triage_state" | "resident_next_step">; busy: boolean; onRefresh: () => void; onNew: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="success"><AlertTitle>Report saved</AlertTitle><AlertDescription>Reference <strong>{report.reference}</strong>. Your observation is recorded.</AlertDescription></Alert>
      <p className="text-sm">{STATUS[report.triage_state]}</p>
      {report.resident_next_step && <p className="text-sm">{report.resident_next_step}</p>}
      <p className="text-xs text-foreground-muted">Guest identity · unverified. This is a demo workflow. Your original observation stays private; public incidents appear after publication review.</p>
      <Button variant="outline" disabled={busy} onClick={onRefresh}>Check report status</Button>
      <Button disabled={busy} onClick={onNew}>Create another report</Button>
    </div>
  );
}

const STATUS: Record<Report["triage_state"], string> = {
  pending: "Assessment pending. Saving does not mean city review or external dispatch has completed.",
  linked: "Your observation has been linked to an incident. Public updates appear after publication review.",
  needs_review: "City review is needed to clarify the location, scope or related incident.",
  private_issue: "This observation is private and needs scope review; it has no public map marker.",
  out_of_scope: "This observation is outside the current city reporting scope. Follow the next step below.",
};
