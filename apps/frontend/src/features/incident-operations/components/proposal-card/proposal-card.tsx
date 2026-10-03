import { AiAgent, Clock, User } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { useState } from "react";
import type { Incident, Institution, ProposalDecision } from "@/api/operations/types";
import { translateAssessment, translatePayloadKey, useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { formatAgo } from "@/shared/utils/format-time";
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
  const { t, locale } = useI18n();
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
          {t("proposal.for", { name: "" })}
          <span className="font-semibold text-foreground-intense">{institution?.name ?? proposal.institutionId}</span>
        </h3>
        <p className={FACTS}>
          <Fact icon={byAgent ? AiAgent : User} label={t("proposal.byLabel")}>
            {proposal.createdBy}
          </Fact>
          <Fact icon={Clock} label={t("proposal.when")}>
            {formatAgo(proposal.createdAt, now, locale)}
          </Fact>
        </p>
      </header>

      <dl
        aria-label={t("proposal.contents")}
        className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border border-border bg-background px-3 py-2.5 font-mono text-xs"
      >
        {proposal.payload.map((field) => (
          <div key={field.key} className="contents">
            <dt className="text-foreground-muted">{translatePayloadKey(t, field.key)}</dt>
            <dd className="text-foreground-intense">{field.key === "City assessment" ? translateAssessment(t, field.value) : field.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-sm text-pretty text-foreground-muted">{proposal.explanation}</p>

      {pending && !rejecting && (
        <div className="flex gap-2">
          <Button className="flex-1" disabled={approving} onClick={approve}>
            {approving ? t("common.sending") : t("proposal.approve")}
          </Button>
          <Button variant="outline" disabled={approving} onClick={() => setRejecting(true)}>
            {t("common.reject")}
          </Button>
        </div>
      )}
      {pending && rejecting && (
        <ReasonForm
          label={t("proposal.rejectWhy")}
          placeholder={t("proposal.rejectPlaceholder")}
          submitLabel={t("proposal.rejectSubmit")}
          destructive
          onCancel={() => setRejecting(false)}
          onSubmit={(reason) => onDecide({ decision: "rejected", ...versions, reason })}
        />
      )}
      {!pending && (
        <p className="text-sm text-foreground-muted">
          {t(`proposal.${proposal.state}` as MessageKey)}
          {proposal.decidedBy && ` ${t("proposal.by", { name: proposal.decidedBy })}`}
          {proposal.decidedAt && ` · ${formatAgo(proposal.decidedAt, now, locale)}`}
          {proposal.reason && ` — “${proposal.reason}”`}
        </p>
      )}
    </section>
  );
}
