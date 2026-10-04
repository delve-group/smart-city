import { Clock, Id, Lock, Ruler, Users } from "@appica/icons-react";
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
import { InfoHint } from "@/shared/components/info-hint/info-hint";
import { tCount, useI18n, translateServerText } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { formatAgo } from "@/shared/utils/format-time";
import { reportsOf } from "../../utils/queue";
import { Fact, FACTS } from "@/shared/components/fact/fact";
import { PanelHeader } from "@/shared/components/panel-header/panel-header";
import { ReviewNotice } from "../review-notice/review-notice";
import { localizedTitle } from "@/shared/utils/incident-summary";

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
  const { t, locale } = useI18n();
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

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [report.id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!choice) {
      setError(t("triage.choose"));
      return;
    }
    if (needsReason && reason.trim().length < 3) {
      setError(t("validation.why"));
      return;
    }
    const expected_version = report.version;
    const triage: ReportTriage = choice.startsWith("link:")
      ? {
          decision: "link",
          expected_version,
          incident_id: choice.slice(5),
          expected_incident_version: workspace.incidents.find((incident) => incident.id === choice.slice(5))?.version ?? 1,
        }
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
      header={<PanelHeader category={category} onCenter={() => onLocate(report.location)} onClose={onClose} />}
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
                <p className="text-sm text-foreground-muted">{translateServerText(t, report.address)}</p>
                <p className={FACTS}>
                  <Fact icon={Id} label={t("common.reference")}>
                    <span className="font-mono">{report.reference}</span>
                  </Fact>
                  <Fact icon={Clock} label={t("common.reported")}>
                    {formatAgo(report.submittedAt, now, locale)}
                  </Fact>
                  <InfoHint label={t("triage.privateReport")} icon={Lock}>
                    {t("triage.privateBody", { unit: report.unit ? t("triage.unit", { unit: report.unit }) : "" })}
                  </InfoHint>
                </p>
              </div>
              {report.review && <ReviewNotice review={report.review} />}
            </div>
            <Separator />

            <section aria-labelledby="triage-label" className="flex flex-col gap-3 py-5">
              <h3 id="triage-label" className="text-sm font-semibold text-foreground-intense">
                {t("triage.title")}
              </h3>
              <RadioGroup
                aria-labelledby="triage-label"
                value={choice}
                onValueChange={(next) => {
                  setChoice(next as Choice);
                  setError(null);
                }}
                className="gap-2"
              >
                {candidates.length > 0 && <p className="text-xs font-medium text-foreground-muted">{t("triage.same")}</p>}
                {candidates.map(({ incident, distanceM, minutesApart }) => {
                  const reports = reportsOf(incident, workspace.reports).length;
                  return (
                    <label key={incident.id} className={OPTION}>
                      <Radio value={`link:${incident.id}`} aria-labelledby={`candidate-${incident.id}`} className="mt-0.5" />
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="flex items-baseline justify-between gap-3">
                          <span id={`candidate-${incident.id}`} className="text-sm font-medium text-foreground-intense">
                            {localizedTitle(t, incident)}
                          </span>
                          <span className="shrink-0 text-xs text-foreground-muted">{t(`response.${incident.responseStatus}` as MessageKey)}</span>
                        </span>
                        <span className={FACTS}>
                          <Fact icon={Ruler} label={t("common.distance")}>
                            {distanceM} m
                          </Fact>
                          <Fact icon={Clock} label={t("common.started")}>
                            {t("triage.minutesEarlier", { count: minutesApart })}
                          </Fact>
                          <Fact icon={Users} label={t("common.reports")}>
                            {tCount(t, locale, "countReports", reports)}
                          </Fact>
                        </span>
                      </span>
                    </label>
                  );
                })}
                {candidates.length > 0 && <p className="pt-2 text-xs font-medium text-foreground-muted">{t("common.or")}</p>}
                <label className={OPTION}>
                  <Radio value="new_incident" aria-labelledby="choice-new" className="mt-0.5" />
                  <span className="flex flex-col gap-0.5">
                    <span id="choice-new" className="text-sm font-medium text-foreground-intense">{t("triage.new")}</span>
                    <span className="text-xs text-foreground-muted">{t("triage.newHint")}</span>
                  </span>
                </label>
                <label className={OPTION}>
                  <Radio value="private_issue" aria-labelledby="choice-private" className="mt-0.5" />
                  <span className="flex flex-col gap-0.5">
                    <span id="choice-private" className="text-sm font-medium text-foreground-intense">{t("triage.private")}</span>
                    <span className="text-xs text-foreground-muted">{t("triage.privateHint")}</span>
                  </span>
                </label>
                <label className={OPTION}>
                  <Radio value="out_of_scope" aria-labelledby="choice-out" className="mt-0.5" />
                  <span className="flex flex-col gap-0.5">
                    <span id="choice-out" className="text-sm font-medium text-foreground-intense">{t("triage.out")}</span>
                    <span className="text-xs text-foreground-muted">{t("triage.outHint")}</span>
                  </span>
                </label>
              </RadioGroup>
            </section>

            {needsReason && (
              <Field invalid={Boolean(error)} className="pb-5">
                <FieldLabel>{t("triage.reasonLabel")}</FieldLabel>
                <Textarea
                  rows={3}
                  maxLength={500}
                  value={reason}
                  placeholder={t("triage.reasonPlaceholder")}
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
            {busy ? t("common.saving") : t("triage.apply")}
          </Button>
        </footer>
      </form>
    </FloatingPanel>
  );
}
