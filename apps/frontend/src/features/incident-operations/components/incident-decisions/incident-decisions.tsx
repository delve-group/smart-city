import { Button } from "@appica/ui-react/button";
import { useState } from "react";
import type { Incident, IncidentCommand } from "@/api/operations/types";
import { PanelAccordionItem } from "@/shared/components/panel-accordion-item/panel-accordion-item";
import { ReasonForm } from "../reason-form/reason-form";

type Decision = "verify" | "dispute" | "reopen";

const FORM: Record<Decision, { label: string; placeholder: string; submit: string }> = {
  verify: { label: "What verifies it?", placeholder: "Crew confirmed on site, camera image, utility record…", submit: "Mark verified" },
  dispute: { label: "What conflicts?", placeholder: "Telemetry shows normal supply, resident retracted…", submit: "Mark disputed" },
  reopen: { label: "Why reopen it?", placeholder: "Residents report the problem is back…", submit: "Reopen incident" },
};

type IncidentDecisionsProps = {
  incident: Incident;
  onCommand: (command: IncidentCommand) => Promise<boolean>;
};

/** Official-only decisions about the incident itself, each recorded with a reason. */
export function IncidentDecisions({ incident, onCommand }: IncidentDecisionsProps) {
  const [open, setOpen] = useState<Decision | null>(null);
  const [closing, setClosing] = useState(false);
  const version = incident.version;
  const finished = incident.responseStatus === "resolved" || incident.responseStatus === "closed";

  async function submit(decision: Decision, reason: string) {
    const done = await onCommand({ type: decision, expected_version: version, reason });
    if (done) setOpen(null);
    return done;
  }

  async function close() {
    setClosing(true);
    await onCommand({ type: "close", expected_version: version });
    setClosing(false);
  }

  return (
    <PanelAccordionItem value="decisions" title="Decisions">
      {open ? (
        <ReasonForm
          label={FORM[open].label}
          placeholder={FORM[open].placeholder}
          submitLabel={FORM[open].submit}
          onCancel={() => setOpen(null)}
          onSubmit={(reason) => submit(open, reason)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {incident.assessment !== "verified" && (
            <Button variant="outline" size="sm" onClick={() => setOpen("verify")}>Verify</Button>
          )}
          {incident.assessment !== "disputed" && (
            <Button variant="outline" size="sm" onClick={() => setOpen("dispute")}>Dispute</Button>
          )}
          {incident.responseStatus === "resolved" && (
            <Button variant="outline" size="sm" disabled={closing} onClick={close}>
              {closing ? "Closing…" : "Close incident"}
            </Button>
          )}
          {finished && (
            <Button variant="outline" size="sm" onClick={() => setOpen("reopen")}>Reopen</Button>
          )}
        </div>
      )}
      <p className="text-xs text-foreground-muted">Resident support never verifies an incident on its own.</p>
    </PanelAccordionItem>
  );
}
