import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { Spinner } from "@appica/ui-react/spinner";
import { useState } from "react";
import type { Proposal } from "@/api/operations/types";
import { ReasonForm } from "../reason-form/reason-form";

type ExecutionStatusProps = {
  proposal: Proposal;
  institutionName: string;
  onReconcile: (reason: string) => Promise<boolean>;
};

/** Between approval and a ticket: sending, or an outcome nobody knows yet. Never claims a ticket exists. */
export function ExecutionStatus({ proposal, institutionName, onReconcile }: ExecutionStatusProps) {
  const [reconciling, setReconciling] = useState(false);

  if (proposal.state !== "unknown") {
    return (
      <div role="status" className="flex items-start gap-3 text-sm text-foreground">
        <Spinner className="mt-0.5 size-4 text-foreground-muted" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground-intense">Approved · sending to {institutionName}</span>
          <span className="text-foreground-muted">No ticket exists yet. This updates when the institution has received it.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Alert variant="warning">
        <AlertTitle as="h3">Outcome unknown</AlertTitle>
        <AlertDescription className="text-pretty">
          {institutionName} did not answer in time, so it is not known whether the ticket exists. It will not be sent again until you check.
        </AlertDescription>
      </Alert>
      {reconciling ? (
        <ReasonForm
          label="Why are you checking now?"
          placeholder="Called the institution, waited ten minutes…"
          submitLabel="Check with the institution"
          onCancel={() => setReconciling(false)}
          onSubmit={onReconcile}
        />
      ) : (
        <Button variant="outline" onClick={() => setReconciling(true)}>Check with the institution…</Button>
      )}
    </div>
  );
}
