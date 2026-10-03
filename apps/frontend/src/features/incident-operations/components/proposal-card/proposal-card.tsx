import { Button } from "@appica/ui-react/button";
import { useState } from "react";
import type { Incident, Institution, ProposalDecision } from "@/api/operations/types";
import { formatAgo } from "@/shared/utils/format-time";
import { PROPOSAL } from "../../utils/labels";
import { ReasonForm } from "../reason-form/reason-form";

type ProposalCardProps = {
  incident: Incident;
  institution: Institution | undefined;
  now: number;
  onDecide: (decision: ProposalDecision) => Promise<boolean>;
};

/**
 * The one action waiting for the official: destination, exact payload and the reason for it.
 * Approve sends exactly this payload; reject sends nothing.
 */
export function ProposalCard({ incident, institution, now, onDecide }: ProposalCardProps) {
  const proposal = incident.proposal;
  const [rejecting, setRejecting] = useState(false);
  const [approving, setApproving] = useState(false);
  if (!proposal) return null;

  const pending = proposal.state === "pending";
  const versions = { expected_proposal_version: proposal.version, expected_incident_version: incident.version };

  async function approve() {
    setApproving(true);
    await onDecide({ decision: "approved", ...versions });
    setApproving(false);
  }

  return (
    <section aria-labelledby="proposal-title" className="flex flex-col gap-4 rounded-md border border-border bg-background-subtle p-4">
      <header className="flex items-baseline justify-between gap-3">
        <h3 id="proposal-title" className="text-sm font-semibold text-foreground-intense">
          Proposal v{proposal.version}
        </h3>
        <span className="text-xs text-foreground-muted">
          {proposal.createdBy} · {formatAgo(proposal.createdAt, now)}
        </span>
      </header>

      <p className="text-sm text-foreground">
        Create a service ticket for{" "}
        <span className="font-semibold text-foreground-intense">{institution?.name ?? proposal.institutionId}</span>
      </p>

      <div>
        <p id="payload-label" className="mb-1.5 text-xs font-medium text-foreground-muted">
          Sent exactly as shown
        </p>
        <dl
          aria-labelledby="payload-label"
          className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border border-border bg-background px-3 py-2.5 font-mono text-xs"
        >
          {proposal.payload.map((field) => (
            <div key={field.key} className="contents">
              <dt className="text-foreground-muted">{field.key}</dt>
              <dd className="text-foreground-intense">{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="text-sm text-pretty text-foreground-muted">{proposal.explanation}</p>

      {pending && !rejecting && (
        <div className="flex gap-2">
          <Button className="flex-1" disabled={approving} onClick={approve}>
            {approving ? "Sending…" : "Approve and send"}
          </Button>
          <Button variant="outline" disabled={approving} onClick={() => setRejecting(true)}>
            Reject
          </Button>
        </div>
      )}
      {pending && rejecting && (
        <ReasonForm
          label="Why reject it?"
          placeholder="Wrong institution, not enough evidence, duplicate…"
          submitLabel="Reject proposal"
          destructive
          onCancel={() => setRejecting(false)}
          onSubmit={(reason) => onDecide({ decision: "rejected", ...versions, reason })}
        />
      )}
      {!pending && (
        <p className="text-sm text-foreground-muted">
          {PROPOSAL[proposal.state]}
          {proposal.decidedBy && ` by ${proposal.decidedBy}`}
          {proposal.decidedAt && ` · ${formatAgo(proposal.decidedAt, now)}`}
          {proposal.reason && ` — “${proposal.reason}”`}
        </p>
      )}
    </section>
  );
}
