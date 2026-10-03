import { AlertTriangle, Check, Users } from "@appica/icons-react";
import { Accordion } from "@appica/ui-react/accordion";
import { Alert, AlertDescription } from "@appica/ui-react/alert";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Separator } from "@appica/ui-react/separator";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/api/categories/types";
import type { PublicIncident } from "@/api/incidents/types";
import { FloatingPanel } from "@/shared/components/floating-panel/floating-panel";
import { PanelAccordionItem } from "@/shared/components/panel-accordion-item/panel-accordion-item";
import { PanelHeader } from "@/shared/components/panel-header/panel-header";
import { tCount, translateKnown, useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { formatDateTime } from "@/shared/utils/format-time";
import { residentStatus, STATUS_STEPS } from "../../utils/incident-status";
import { AffectedButton } from "../affected-button/affected-button";
import { NearbyIncidents } from "../nearby-incidents/nearby-incidents";

type Props = {
  incident: PublicIncident;
  incidents: readonly PublicIncident[];
  category?: Category;
  now: number;
  onClose: () => void;
  onCenter: () => void;
  onSelect: (incident: PublicIncident) => void;
  onContribute: () => Promise<void>;
};

export function IncidentPanel({ incident, incidents, category, now, onClose, onCenter, onSelect, onContribute }: Props) {
  const { t, locale } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [titleHidden, setTitleHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Move focus to the new content so keyboard and screen reader users land on it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [incident.id]);

  // Once the title scrolls away, repeat it in the header so the panel keeps its subject.
  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;
    const observer = new IntersectionObserver(([entry]) => setTitleHidden(!entry.isIntersecting));
    observer.observe(heading);
    return () => observer.disconnect();
  }, [incident.id]);

  async function contribute() {
    setError(null);
    try {
      await onContribute();
    } catch (failure) {
      setError(failure instanceof Error ? translateKnown(t, failure.message) : t("incidentMap.supportFailed"));
    }
  }

  const count = new Intl.NumberFormat(locale === "pl" ? "pl-PL" : "en-GB");
  const counted =
    incident.viewer_support === "reporter" ? t("incidentMap.reporter") : incident.viewer_support === "contributor" ? t("report.affectedYou") : null;
  const current = STATUS_STEPS.indexOf(residentStatus(incident));

  return (
    <FloatingPanel
      labelledBy="incident-panel-title"
      header={
        <div className="flex flex-col gap-1">
          <PanelHeader category={category} onCenter={onCenter} onClose={onClose} />
          {titleHidden && (
            <p aria-hidden className="truncate text-sm font-semibold text-foreground-intense transition-opacity duration-150 starting:opacity-0">
              {incident.public_summary}
            </p>
          )}
        </div>
      }
    >
      <ScrollArea className="min-h-0 flex-1">
        <div key={incident.id} className="flex flex-col px-5 pb-6 transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none">
          <h2
            id="incident-panel-title"
            ref={headingRef}
            tabIndex={-1}
            className="pt-4 pb-1 text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground-intense outline-none"
          >
            {incident.public_summary}
          </h2>

          <section className="flex flex-col gap-3 pt-3 pb-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-md bg-background-muted p-3">
                <span className="text-sm font-semibold text-foreground-intense tabular-nums">{count.format(incident.support_count)}</span>
                <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Users size={14} aria-hidden />
                  {tCount(t, locale, "residentNoun", incident.support_count)}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-md bg-background-muted p-3">
                <span className={`text-sm font-semibold ${incident.severity === "high" ? "text-error-emphasis" : "text-foreground-intense"}`}>
                  {incident.severity ? t(`severity.${incident.severity}` as MessageKey) : t("report.severityUnknown")}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <AlertTriangle size={14} aria-hidden />
                  {t("report.severity")}
                </span>
              </div>
            </div>
            {incident.accepts_contributions && <AffectedButton countedText={counted} onConfirm={contribute} />}
            {error && <Alert variant="error"><AlertDescription>{error}</AlertDescription></Alert>}
          </section>

          <Separator />
          <Accordion variant="flush" multiple defaultValue={["progress"]} className="gap-0">
            <PanelAccordionItem value="progress" title={t("report.progress")}>
              <ol className="flex flex-col">
                {STATUS_STEPS.map((step, index) => {
                  const done = index < current;
                  const active = index === current;
                  return (
                    <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
                      {index < STATUS_STEPS.length - 1 && (
                        <span aria-hidden className={`absolute top-6 bottom-0 left-[0.6875rem] w-px ${done ? "bg-primary" : "bg-border"}`} />
                      )}
                      <span
                        aria-hidden
                        className={`relative flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                          done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary bg-background" : "border-border bg-background"
                        }`}
                      >
                        {done && <Check size={14} strokeWidth={3} />}
                        {active && <span className="size-2 rounded-full bg-primary" />}
                      </span>
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <span className={`text-sm ${active ? "font-semibold text-foreground-intense" : done ? "text-foreground" : "text-foreground-muted"}`}>
                          {t(`status.${step}` as MessageKey)}
                          <span className="sr-only">{done ? ` (${t("common.done")})` : active ? ` (${t("common.current")})` : ` (${t("common.pending")})`}</span>
                        </span>
                        {active && <span className="text-sm text-foreground-muted">{t(`status.${step}Hint` as MessageKey)}</span>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </PanelAccordionItem>
            <Separator />
            <PanelAccordionItem value="details" title={t("common.details")}>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {[
                  { label: t("report.location"), value: incident.public_location.label },
                  { label: t("common.reported"), value: formatDateTime(incident.created_at, now, locale) },
                  { label: t("report.lastUpdate"), value: formatDateTime(incident.updated_at, now, locale) },
                  { label: t("common.reference"), value: incident.reference },
                ].map((fact) => (
                  <div key={fact.label} className="contents">
                    <dt className="text-foreground-muted">{fact.label}</dt>
                    <dd className="text-foreground-intense">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </PanelAccordionItem>
            <Separator />
            <NearbyIncidents incident={incident} incidents={incidents} onSelect={onSelect} />
            <Separator />
            <PanelAccordionItem value="history" title={t("common.history")}>
              {incident.timeline.length ? (
                <ol className="flex flex-col gap-4">
                  {incident.timeline.map((event) => (
                    <li key={event.id} className="flex flex-col gap-1 border-l-2 border-border pl-3">
                      <p className="text-sm text-foreground">{t(`incidentMap.timeline.${event.kind}` as MessageKey)}</p>
                      <time dateTime={event.occurred_at} className="text-xs text-foreground-muted">{formatDateTime(event.occurred_at, now, locale)}</time>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-foreground-muted">{t("incidentMap.emptyTimeline")}</p>
              )}
            </PanelAccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </FloatingPanel>
  );
}
