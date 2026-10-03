import { DotsVertical } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
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
  const version = incident.version;
  const finished = incident.responseStatus === "resolved" || incident.responseStatus === "closed";

  function start(next: Decision) {
    setDecision(next);
    setOpen(true);
  }

  async function submit(reason: string) {
    const done = await onCommand({ type: decision, expected_version: version, reason });
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
          <div className="px-6 pb-6">
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
