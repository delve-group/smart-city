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
import { ASSESSMENT_HINT } from "../../utils/incident-status";
import { IncidentStatus } from "../incident-status/incident-status";
import { NearbyIncidents } from "../nearby-incidents/nearby-incidents";

type Props = { incident: PublicIncident; incidents: readonly PublicIncident[]; category?: Category; now: number; onClose: () => void; onCenter: () => void; onSelect: (incident: PublicIncident) => void; onContribute: () => Promise<void> };

export function IncidentPanel({ incident, incidents, category, now, onClose, onCenter, onSelect, onContribute }: Props) {
  const title = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [incident.id]);
  async function contribute() {
    setBusy(true); setError(null);
    try { await onContribute(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not record your support. Try again."); }
    finally { setBusy(false); }
  }
  return <FloatingPanel labelledBy="incident-panel-title" header={<PanelHeader category={category} onCenter={onCenter} onClose={onClose} />}>
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-4 px-5 py-5">
        <h2 id="incident-panel-title" ref={title} tabIndex={-1} className="text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground-intense outline-none">{incident.public_summary}</h2>
        <IncidentStatus incident={incident} />
        <p className="text-sm text-foreground-muted">{ASSESSMENT_HINT[incident.assessment]}</p>
        <p className="text-sm"><strong>{incident.support_count}</strong> distinct {incident.support_count === 1 ? "supporter" : "supporters"} · identities are unverified{incident.provenance === "demo" ? " demo identities" : ""}.</p>
        <p className="text-xs text-foreground-muted">{incident.provenance === "demo" ? "Fictional demo incident. " : ""}The highlighted place is a location reference, not a measured outage boundary.</p>
        <Button disabled={busy || Boolean(incident.viewer_support) || !incident.accepts_contributions} focusableWhenDisabled onClick={() => void contribute()}>
          {busy ? "Recording support…" : incident.viewer_support === "reporter" ? "Your report already counts" : incident.viewer_support === "contributor" ? "You are already counted" : !incident.accepts_contributions ? "Incident finished — no new support" : "I’m affected too"}
        </Button>
        {error && <Alert variant="error"><AlertDescription>{error}</AlertDescription></Alert>}
        <Separator />
        <Accordion variant="flush" multiple defaultValue={["timeline"]}>
          <PanelAccordionItem value="timeline" title="Public timeline">
            {incident.timeline.length ? <ol className="flex flex-col gap-4">{incident.timeline.map((event) => <li key={event.id} className="flex flex-col gap-1 border-l-2 border-border pl-3">
              <p className="text-sm">{event.text}</p><time dateTime={event.occurred_at} className="text-xs text-foreground-muted">{formatDateTime(event.occurred_at, now)}</time>
            </li>)}</ol> : <p className="text-sm text-foreground-muted">No public events recorded yet.</p>}
          </PanelAccordionItem>
          <Separator />
          <PanelAccordionItem value="details" title="Details">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt>Location</dt><dd>{incident.public_location.label}</dd>
              <dt>Precision</dt><dd>{incident.public_location.precision}</dd>
              <dt>Reference</dt><dd>{incident.reference}</dd>
              <dt>First reported</dt><dd>{formatDateTime(incident.created_at, now)}</dd>
              <dt>Last update</dt><dd>{formatDateTime(incident.updated_at, now)}</dd>
            </dl>
          </PanelAccordionItem>
          <Separator />
          <NearbyIncidents incident={incident} incidents={incidents} onSelect={onSelect} />
        </Accordion>
      </div>
    </ScrollArea>
  </FloatingPanel>;
}
