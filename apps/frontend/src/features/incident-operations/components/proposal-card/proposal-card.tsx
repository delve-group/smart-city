import { AiAgent, Clock, User } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { useState } from "react";
import type { Incident, Institution, ProposalDecision } from "@/api/operations/types";
import { formatAgo } from "@/shared/utils/format-time";
import { PROPOSAL } from "../../utils/labels";
import { Fact, FACTS } from "@/shared/components/fact/fact";
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
  // The API names actors, not their kind; agents are named as such.
  const byAgent = /agent/i.test(proposal.createdBy);
  const versions = { expected_proposal_version: proposal.version, expected_incident_version: incident.version };

  async function approve() {
    setApproving(true);
    await onDecide({ decision: "approved", ...versions });
    setApproving(false);
  }

  return (
    <section aria-labelledby="proposal-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <h3 id="proposal-title" className="text-base text-pretty text-foreground">
          Create a service ticket for{" "}
          <span className="font-semibold text-foreground-intense">{institution?.name ?? proposal.institutionId}</span>
        </h3>
        <p className={FACTS}>
          <Fact icon={byAgent ? AiAgent : User} label="Proposed by">
            {proposal.createdBy}
          </Fact>
          <Fact icon={Clock} label="Proposed">
            {formatAgo(proposal.createdAt, now)}
          </Fact>
        </p>
      </header>

      <dl
        aria-label="Ticket contents, sent exactly as shown"
        className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border border-border bg-background px-3 py-2.5 font-mono text-xs"
      >
        {proposal.payload.map((field) => (
          <div key={field.key} className="contents">
            <dt className="text-foreground-muted">{field.key}</dt>
            <dd className="text-foreground-intense">{field.value}</dd>
          </div>
        ))}
      </dl>

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
