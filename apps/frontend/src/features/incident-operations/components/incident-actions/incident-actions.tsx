import { DotsVertical } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { Checkbox } from "@appica/ui-react/checkbox";
import { CheckboxGroup } from "@appica/ui-react/checkbox-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@appica/ui-react/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@appica/ui-react/dropdown-menu";
import { useState } from "react";
import type { Incident, IncidentCommand } from "@/api/operations/types";
import { ReasonForm } from "../reason-form/reason-form";

type Decision = "verify" | "dispute" | "reopen";

const FORM: Record<Decision, { title: string; hint: string; label: string; placeholder: string; submit: string }> = {
  verify: {
    title: "Mark as verified",
    hint: "Record what confirms the incident. Resident reports alone never verify it.",
    label: "What verifies it?",
    placeholder: "Crew confirmed on site, camera image, utility record…",
    submit: "Mark verified",
  },
  dispute: {
    title: "Mark as disputed",
    hint: "Record the conflicting information. The incident stays open.",
    label: "What conflicts?",
    placeholder: "Telemetry shows normal supply, resident retracted…",
    submit: "Mark disputed",
  },
  reopen: {
    title: "Reopen incident",
    hint: "It goes back to review; the previous ticket stays in the history.",
    label: "Why reopen it?",
    placeholder: "Residents report the problem is back…",
    submit: "Reopen incident",
  },
};

type IncidentActionsProps = {
  incident: Incident;
  onCommand: (command: IncidentCommand) => Promise<boolean>;
};

/** Decisions about the incident itself, kept out of the response flow: a menu in the panel header. */
export function IncidentActions({ incident, onCommand }: IncidentActionsProps) {
  const [open, setOpen] = useState(false);
  /** Kept after closing, so the dialog's exit animation still shows its content. */
  const [decision, setDecision] = useState<Decision>("verify");
  /** Evidence the verification rests on; a verification must cite at least one stored item. */
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [evidenceError, setEvidenceError] = useState(false);
  const citable = incident.evidence.filter((item) => item.state !== "missing");
  const version = incident.version;
  const finished = incident.responseStatus === "resolved" || incident.responseStatus === "closed";

  function start(next: Decision) {
    setDecision(next);
    setEvidenceIds([]);
    setEvidenceError(false);
    setOpen(true);
  }

  async function submit(reason: string) {
    if (decision === "verify" && evidenceIds.length === 0) {
      setEvidenceError(true);
      return false;
    }
    const command: IncidentCommand =
      decision === "verify"
        ? { type: "verify", expected_version: version, evidence_ids: evidenceIds, reason }
        : { type: decision, expected_version: version, reason };
    const done = await onCommand(command);
    if (done) setOpen(false);
    return done;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-md" aria-label="More decisions" />}>
          <DotsVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {incident.assessment !== "verified" && <DropdownMenuItem onClick={() => start("verify")}>Mark as verified…</DropdownMenuItem>}
          {incident.assessment !== "disputed" && <DropdownMenuItem onClick={() => start("dispute")}>Mark as disputed…</DropdownMenuItem>}
          {incident.responseStatus === "resolved" && (
            <DropdownMenuItem onClick={() => void onCommand({ type: "close", expected_version: version })}>Close incident</DropdownMenuItem>
          )}
          {finished && <DropdownMenuItem onClick={() => start("reopen")}>Reopen…</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{FORM[decision].title}</DialogTitle>
            <DialogDescription>{FORM[decision].hint}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 pb-6">
            {decision === "verify" && (
              <div className="flex flex-col gap-1">
                <p id="verify-evidence-label" className="text-sm font-medium text-foreground-intense">Evidence it rests on</p>
                {citable.length > 0 ? (
                  <CheckboxGroup
                    aria-labelledby="verify-evidence-label"
                    value={evidenceIds}
                    onValueChange={(value: string[]) => {
                      setEvidenceIds(value);
                      setEvidenceError(false);
                    }}
                    className="gap-0"
                  >
                    {citable.map((item) => (
                      <label key={item.id} className="flex min-h-11 items-center gap-3 rounded-md px-2 text-sm select-none hover:bg-background-muted">
                        <Checkbox name={item.id} aria-labelledby={`verify-evidence-${item.id}`} />
                        <span id={`verify-evidence-${item.id}`} className="min-w-0 flex-1 text-foreground">
                          {item.label}
                          {item.state !== "current" && <span className="text-foreground-muted"> · {item.state}</span>}
                        </span>
                      </label>
                    ))}
                  </CheckboxGroup>
                ) : (
                  <p className="text-sm text-foreground-muted">No stored evidence can be cited yet, so this incident cannot be verified.</p>
                )}
                {evidenceError && <p role="alert" className="text-sm text-error">Choose the evidence that verifies it.</p>}
              </div>
            )}
            <ReasonForm
              key={decision}
              label={FORM[decision].label}
              placeholder={FORM[decision].placeholder}
              submitLabel={FORM[decision].submit}
              onCancel={() => setOpen(false)}
              onSubmit={submit}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
