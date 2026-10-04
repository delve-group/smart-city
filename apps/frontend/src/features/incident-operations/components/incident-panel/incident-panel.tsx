import { Clock, Id } from "@appica/icons-react";
import { Accordion } from "@appica/ui-react/accordion";
import { Badge } from "@appica/ui-react/badge";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Separator } from "@appica/ui-react/separator";
import { useEffect, useRef } from "react";
import type { Category } from "@/api/categories/types";
import type { Incident, IncidentCommand, OperationsReport, ProposalDecision, Workspace } from "@/api/operations/types";
import { FloatingPanel } from "@/shared/components/floating-panel/floating-panel";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { formatAgo } from "@/shared/utils/format-time";
import { institutionName, reportsOf } from "../../utils/queue";
import { ASSESSMENT } from "../../utils/labels";
import { EvidenceList } from "../evidence-list/evidence-list";
import { ExecutionStatus } from "../execution-status/execution-status";
import { Fact, FACTS } from "@/shared/components/fact/fact";
import { IncidentActions } from "../incident-actions/incident-actions";
import { IncidentHistory } from "../incident-history/incident-history";
import { PanelHeader } from "@/shared/components/panel-header/panel-header";
import { ProposalCard } from "../proposal-card/proposal-card";
import { ResponsibilityPicker } from "../responsibility-picker/responsibility-picker";
import { ReviewNotice } from "../review-notice/review-notice";
import { TicketProgress } from "../ticket-progress/ticket-progress";
import { localizedTitle } from "@/shared/utils/incident-summary";

type IncidentPanelProps = {
  incident: Incident;
  workspace: Workspace;
  category: Category | undefined;
  now: number;
  onClose: () => void;
  onLocate: (location: { lat: number; lng: number }) => void;
  onDecide: (incident: Incident, decision: ProposalDecision) => Promise<boolean>;
  onReconcile: (incident: Incident, reason: string) => Promise<boolean>;
  onCommand: (incident: Incident, command: IncidentCommand) => Promise<boolean>;
};

/** Which response step the official sees first. */
function nextStep(incident: Incident): "proposal" | "sending" | "choose" | "ticket" | "none" {
  if (incident.proposal?.state === "pending") return "proposal";
  // Approved but not yet confirmed by the institution: never shown as sent, never offered for a second send.
  if (incident.proposal && ["approved", "executing", "unknown"].includes(incident.proposal.state)) return "sending";
  const ticketActive = incident.ticket && incident.ticket.status !== "rejected";
  const open = ["new", "triaged"].includes(incident.responseStatus);
  if (open && !ticketActive) return "choose";
  return incident.ticket ? "ticket" : "none";
}

export function IncidentPanel({ incident, workspace, category, now, onClose, onLocate, onDecide, onReconcile, onCommand }: IncidentPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reports: OperationsReport[] = reportsOf(incident, workspace.reports);
  const { t, locale } = useI18n();
  const step = nextStep(incident);
  // The incident started with its earliest report; ISO strings sort by time.
  const started = reports.map((report) => report.submittedAt).sort()[0] ?? incident.history[0]?.at;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [incident.id]);

  return (
    <FloatingPanel
      labelledBy="incident-panel-title"
      header={
        <PanelHeader
          category={category}
          actions={<IncidentActions incident={incident} onCommand={(command) => onCommand(incident, command)} />}
          onCenter={() => onLocate(incident.location)}
          onClose={onClose}
        />
      }
    >
      <ScrollArea className="min-h-0 flex-1">
        <div key={incident.id} className="flex flex-col px-5 pb-6 transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none">
          <div className="flex flex-col gap-3 pt-4 pb-5">
            <div className="flex flex-col gap-2">
              <h2
                id="incident-panel-title"
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground-intense outline-none"
              >
                {localizedTitle(t, incident)}
              </h2>
              <p className="text-sm text-foreground-muted">{[incident.address, incident.district].filter(Boolean).join(" · ")}</p>
              <p className={FACTS}>
                <Fact icon={Id} label={t("common.reference")}>
                  <span className="font-mono">{incident.reference}</span>
                </Fact>
                {started && (
                  <Fact icon={Clock} label={t("common.started")}>
                    {formatAgo(started, now, locale)}
                  </Fact>
                )}
                {/* Only an official's verdict is worth a badge; "suspected" is the default state. */}
                {(incident.assessment === "verified" || incident.assessment === "disputed") && (
                  <Badge variant={ASSESSMENT[incident.assessment].variant} size="xs" title={t(`assessment.${incident.assessment}Hint` as MessageKey)}>
                    {t(`assessment.${incident.assessment}` as MessageKey)}
                  </Badge>
                )}
              </p>
            </div>
            {incident.review && <ReviewNotice review={incident.review} />}
          </div>

          {step !== "none" && (
            <>
              <Separator />
              <div className="py-5">
                {step === "proposal" && (
                  <ProposalCard
                    incident={incident}
                    institution={workspace.institutions.find((institution) => institution.id === incident.proposal?.institutionId)}
                    now={now}
                    onDecide={(decision) => onDecide(incident, decision)}
                  />
                )}
                {step === "sending" && incident.proposal && (
                  <ExecutionStatus
                    proposal={incident.proposal}
                    institutionName={institutionName(workspace, incident.proposal.institutionId)}
                    onReconcile={(reason) => onReconcile(incident, reason)}
                  />
                )}
                {step === "choose" && (
                  <ResponsibilityPicker
                    key={incident.version}
                    incident={incident}
                    category={category}
                    institutions={workspace.institutions}
                    onChoose={(institutionId) =>
                      onCommand(incident, { type: "choose_institution", expected_version: incident.version, institution_id: institutionId })
                    }
                  />
                )}
                {step === "ticket" && incident.ticket && (
                  <TicketProgress ticket={incident.ticket} institutionName={institutionName(workspace, incident.ticket.institutionId)} now={now} />
                )}
              </div>
            </>
          )}

          <Separator />
          <Accordion variant="flush" multiple className="gap-0">
            <EvidenceList
              reports={reports}
              observations={incident.evidence.filter((item) => item.kind !== "report")}
              now={now}
              onLocate={(report) => onLocate(report.location)}
            />
            <Separator />
            <IncidentHistory history={incident.history} now={now} />
          </Accordion>
        </div>
      </ScrollArea>
    </FloatingPanel>
  );
}
