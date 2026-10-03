import { Lock, Microphone, Forms } from "@appica/icons-react";
import { Badge } from "@appica/ui-react/badge";
import { Button } from "@appica/ui-react/button";
import { Field, FieldError, FieldLabel } from "@appica/ui-react/field";
import { Radio } from "@appica/ui-react/radio";
import { RadioGroup } from "@appica/ui-react/radio-group";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Separator } from "@appica/ui-react/separator";
import { Textarea } from "@appica/ui-react/textarea";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Category } from "@/api/categories/types";
import type { OperationsReport, ReportTriage, Workspace } from "@/api/operations/types";
import { FloatingPanel } from "@/shared/components/floating-panel/floating-panel";
import { formatAgo } from "@/shared/utils/format-time";
import { RESPONSE } from "../../utils/labels";
import { PanelHeader } from "../panel-header/panel-header";
import { ReviewNotice } from "../review-notice/review-notice";

type ReportReviewPanelProps = {
  report: OperationsReport;
  workspace: Workspace;
  category: Category | undefined;
  now: number;
  onClose: () => void;
  onLocate: (location: { lat: number; lng: number }) => void;
  onTriage: (report: OperationsReport, triage: ReportTriage) => Promise<boolean>;
};

type Choice = `link:${string}` | "new_incident" | "private_issue" | "out_of_scope";

const OPTION = "flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors duration-150 select-none hover:bg-background-subtle has-data-checked:border-primary has-data-checked:bg-primary-subtle";

/** A report the system could not place on its own: link it, start an incident, or keep it out. */
export function ReportReviewPanel({ report, workspace, category, now, onClose, onLocate, onTriage }: ReportReviewPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const candidates = (report.review?.candidates ?? []).flatMap((candidate) => {
    const incident = workspace.incidents.find((item) => item.id === candidate.incidentId);
    return incident ? [{ ...candidate, incident }] : [];
  });
  const [choice, setChoice] = useState<Choice | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const needsReason = choice === "private_issue" || choice === "out_of_scope";
  const ChannelIcon = report.channel === "voice" ? Microphone : Forms;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [report.id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!choice) {
      setError("Choose what to do with the report.");
      return;
    }
    if (needsReason && reason.trim().length < 3) {
      setError("Say why, in a few words.");
      return;
    }
    const expected_version = report.version;
    const triage: ReportTriage = choice.startsWith("link:")
      ? { decision: "link", expected_version, incident_id: choice.slice(5) }
      : choice === "new_incident"
        ? { decision: "new_incident", expected_version }
        : { decision: choice as "private_issue" | "out_of_scope", expected_version, reason: reason.trim() };
    setBusy(true);
    const done = await onTriage(report, triage);
    if (!done) setBusy(false);
  }

  return (
    <FloatingPanel
      labelledBy="report-review-title"
      header={<PanelHeader category={category} reference={report.reference} onCenter={() => onLocate(report.location)} onClose={onClose} />}
    >
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div key={report.id} className="flex flex-col px-5 pb-6 transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none">
            <div className="flex flex-col gap-3 pt-4 pb-5">
              <div className="flex flex-col gap-2">
                <h2
                  id="report-review-title"
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-xl leading-snug font-semibold text-pretty text-foreground-intense outline-none"
                >
                  {report.summary}
                </h2>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground-muted">
                  <span>{report.address}</span>
                  {report.unit && (
                    <span className="inline-flex items-center gap-1">
                      <Lock size={12} aria-hidden />
                      {report.unit} · staff only
                    </span>
                  )}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <ChannelIcon size={14} aria-hidden />
                  {report.channel === "voice" ? "Voice" : "Form"} report · {formatAgo(report.submittedAt, now)}
                  <Badge variant="outline" size="xs" className="ms-1">
                    Private until reviewed
                  </Badge>
                </p>
              </div>
              {report.review && <ReviewNotice review={report.review} />}
            </div>
            <Separator />

            <fieldset className="flex flex-col gap-2 py-5">
              <legend id="triage-label" className="mb-3 text-sm font-semibold text-foreground-intense">
                What should happen to it?
              </legend>
              <RadioGroup
                aria-labelledby="triage-label"
                value={choice}
                onValueChange={(next) => {
                  setChoice(next as Choice);
                  setError(null);
                }}
                className="gap-2"
              >
                {candidates.map(({ incident, distanceM, minutesApart }) => (
                  <label key={incident.id} className={OPTION}>
                    <Radio value={`link:${incident.id}`} aria-labelledby={`candidate-${incident.id}`} className="mt-0.5" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span id={`candidate-${incident.id}`} className="text-sm font-medium text-foreground-intense">
                        Link to {incident.title}
                      </span>
                      <span className="text-xs text-foreground-muted">
                        {incident.reference} · {distanceM} m away · {minutesApart} min apart · {RESPONSE[incident.responseStatus].label}
                      </span>
                    </span>
                  </label>
                ))}
                <label className={OPTION}>
                  <Radio value="new_incident" aria-labelledby="choice-new" className="mt-0.5" />
                  <span className="flex flex-col gap-0.5">
                    <span id="choice-new" className="text-sm font-medium text-foreground-intense">Start a new incident</span>
                    <span className="text-xs text-foreground-muted">A separate problem; you choose who responds next.</span>
                  </span>
                </label>
                <label className={OPTION}>
                  <Radio value="private_issue" aria-labelledby="choice-private" className="mt-0.5" />
                  <span className="flex flex-col gap-0.5">
                    <span id="choice-private" className="text-sm font-medium text-foreground-intense">Private issue</span>
                    <span className="text-xs text-foreground-muted">Inside one home or building; never shown on the public map.</span>
                  </span>
                </label>
                <label className={OPTION}>
                  <Radio value="out_of_scope" aria-labelledby="choice-out" className="mt-0.5" />
                  <span className="flex flex-col gap-0.5">
                    <span id="choice-out" className="text-sm font-medium text-foreground-intense">Out of scope</span>
                    <span className="text-xs text-foreground-muted">Not something the city handles.</span>
                  </span>
                </label>
              </RadioGroup>
            </fieldset>

            {needsReason && (
              <Field invalid={Boolean(error)} className="pb-5">
                <FieldLabel>Reason the resident will see</FieldLabel>
                <Textarea
                  rows={3}
                  maxLength={500}
                  value={reason}
                  placeholder="This affects only your flat. Contact your building administrator."
                  onChange={(event) => {
                    setReason(event.target.value);
                    setError(null);
                  }}
                />
                <FieldError match={Boolean(error)}>{error}</FieldError>
              </Field>
            )}
            {!needsReason && error && <p role="alert" className="pb-5 text-sm text-error">{error}</p>}
          </div>
        </ScrollArea>
        <footer className="flex gap-2 border-t border-border-muted px-5 py-4">
          <Button type="submit" size="lg" className="flex-1" disabled={busy}>
            {busy ? "Saving…" : "Apply decision"}
          </Button>
        </footer>
      </form>
    </FloatingPanel>
  );
}
