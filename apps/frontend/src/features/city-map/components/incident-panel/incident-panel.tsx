import { useEffect, useRef, useState } from "react";
import { Accordion } from "@appica/ui-react/accordion";
import { Alert, AlertDescription } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Separator } from "@appica/ui-react/separator";
import type { Category } from "@/api/categories/types";
import type { PublicIncident } from "@/api/incidents/types";
import { FloatingPanel } from "@/shared/components/floating-panel/floating-panel";
import { PanelHeader } from "@/shared/components/panel-header/panel-header";
import { PanelAccordionItem } from "@/shared/components/panel-accordion-item/panel-accordion-item";
import { formatDateTime } from "@/shared/utils/format-time";
import { useI18n, tCount, translateKnown } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { IncidentStatus } from "../incident-status/incident-status";
import { NearbyIncidents } from "../nearby-incidents/nearby-incidents";

type Props = { incident: PublicIncident; incidents: readonly PublicIncident[]; category?: Category; now: number; onClose: () => void; onCenter: () => void; onSelect: (incident: PublicIncident) => void; onContribute: () => Promise<void> };

export function IncidentPanel({ incident, incidents, category, now, onClose, onCenter, onSelect, onContribute }: Props) {
  const { t, locale } = useI18n();
  const title = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [incident.id]);
  async function contribute() {
    setBusy(true); setError(null);
    try { await onContribute(); }
    catch (failure) { setError(failure instanceof Error ? translateKnown(t, failure.message) : t("incidentMap.supportFailed")); }
    finally { setBusy(false); }
  }
  return <FloatingPanel labelledBy="incident-panel-title" header={<PanelHeader category={category} onCenter={onCenter} onClose={onClose} />}>
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-4 px-5 py-5">
        <h2 id="incident-panel-title" ref={title} tabIndex={-1} className="text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground-intense outline-none">{incident.public_summary}</h2>
        <IncidentStatus incident={incident} />
        <p className="text-sm text-foreground-muted">{t(`assessment.${incident.assessment}Hint` as MessageKey)}</p>
        <p className="text-sm">{tCount(t, locale, "incidentMap.supporters", incident.support_count)} · {t(incident.provenance === "demo" ? "incidentMap.identityDemo" : "incidentMap.identityLive")}</p>
        <p className="text-xs text-foreground-muted">{incident.provenance === "demo" ? `${t("incidentMap.fixture")} ` : ""}{t("incidentMap.boundaryHint")}</p>
        <Button disabled={busy || Boolean(incident.viewer_support) || !incident.accepts_contributions} focusableWhenDisabled onClick={() => void contribute()}>
          {t(busy ? "incidentMap.recording" : incident.viewer_support === "reporter" ? "incidentMap.reporter" : incident.viewer_support === "contributor" ? "incidentMap.contributor" : !incident.accepts_contributions ? "incidentMap.finished" : "incidentMap.affected")}
        </Button>
        {error && <Alert variant="error"><AlertDescription>{error}</AlertDescription></Alert>}
        <Separator />
        <Accordion variant="flush" multiple defaultValue={["timeline"]}>
          <PanelAccordionItem value="timeline" title={t("incidentMap.timeline")}>
            {incident.timeline.length ? <ol className="flex flex-col gap-4">{incident.timeline.map((event) => <li key={event.id} className="flex flex-col gap-1 border-l-2 border-border pl-3">
              <p className="text-sm">{t(`incidentMap.timeline.${event.kind}` as MessageKey)}</p><time dateTime={event.occurred_at} className="text-xs text-foreground-muted">{formatDateTime(event.occurred_at, now, locale)}</time>
            </li>)}</ol> : <p className="text-sm text-foreground-muted">{t("incidentMap.emptyTimeline")}</p>}
          </PanelAccordionItem>
          <Separator />
          <PanelAccordionItem value="details" title={t("common.details")}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt>{t("report.location")}</dt><dd>{incident.public_location.label}</dd>
              <dt>{t("incidentMap.precision")}</dt><dd>{t(`incidentMap.precision.${incident.public_location.precision}` as MessageKey)}</dd>
              <dt>{t("common.reference")}</dt><dd>{incident.reference}</dd>
              <dt>{t("incidentMap.firstReported")}</dt><dd>{formatDateTime(incident.created_at, now, locale)}</dd>
              <dt>{t("report.lastUpdate")}</dt><dd>{formatDateTime(incident.updated_at, now, locale)}</dd>
            </dl>
          </PanelAccordionItem>
          <Separator />
          <NearbyIncidents incident={incident} incidents={incidents} onSelect={onSelect} />
        </Accordion>
      </div>
    </ScrollArea>
  </FloatingPanel>;
}
