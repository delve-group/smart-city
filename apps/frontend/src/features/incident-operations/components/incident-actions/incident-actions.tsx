import { DotsVertical } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { Checkbox } from "@appica/ui-react/checkbox";
import { CheckboxGroup } from "@appica/ui-react/checkbox-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@appica/ui-react/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@appica/ui-react/dropdown-menu";
import { useState } from "react";
import type { Incident, IncidentCommand } from "@/api/operations/types";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { ReasonForm } from "../reason-form/reason-form";

type Decision = "verify" | "dispute" | "reopen";

const FORM: Record<Decision, { title: MessageKey; hint: MessageKey; label: MessageKey; placeholder: MessageKey; submit: MessageKey }> = {
  verify: {
    title: "decision.verifyTitle",
    hint: "decision.verifyHint",
    label: "decision.verifyLabel",
    placeholder: "decision.verifyPlaceholder",
    submit: "decision.verifySubmit",
  },
  dispute: {
    title: "decision.disputeTitle",
    hint: "decision.disputeHint",
    label: "decision.disputeLabel",
    placeholder: "decision.disputePlaceholder",
    submit: "decision.disputeSubmit",
  },
  reopen: {
    title: "decision.reopenTitle",
    hint: "decision.reopenHint",
    label: "decision.reopenLabel",
    placeholder: "decision.reopenPlaceholder",
    submit: "decision.reopenSubmit",
  },
};

type IncidentActionsProps = {
  incident: Incident;
  onCommand: (command: IncidentCommand) => Promise<boolean>;
};

/** Decisions about the incident itself, kept out of the response flow: a menu in the panel header. */
export function IncidentActions({ incident, onCommand }: IncidentActionsProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  /** Kept after closing, so the dialog's exit animation still shows its content. */
  const [decision, setDecision] = useState<Decision>("verify");
  const form = FORM[decision];
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
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-md" aria-label={t("decision.more")} />}>
          <DotsVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {incident.assessment !== "verified" && <DropdownMenuItem onClick={() => start("verify")}>{t("decision.verify")}</DropdownMenuItem>}
          {incident.assessment !== "disputed" && <DropdownMenuItem onClick={() => start("dispute")}>{t("decision.dispute")}</DropdownMenuItem>}
          {incident.responseStatus === "resolved" && (
            <DropdownMenuItem onClick={() => void onCommand({ type: "close", expected_version: version })}>{t("decision.close")}</DropdownMenuItem>
          )}
          {finished && <DropdownMenuItem onClick={() => start("reopen")}>{t("decision.reopen")}</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t(form.title)}</DialogTitle>
            <DialogDescription>{t(form.hint)}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 pb-6">
            {decision === "verify" && (
              <div className="flex flex-col gap-1">
                <p id="verify-evidence-label" className="text-sm font-medium text-foreground-intense">{t("evidence.rests")}</p>
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
                          {item.state !== "current" && <span className="text-foreground-muted"> · {t(`evidence.${item.state}` as MessageKey)}</span>}
                        </span>
                      </label>
                    ))}
                  </CheckboxGroup>
                ) : (
                  <p className="text-sm text-foreground-muted">{t("evidence.none")}</p>
                )}
                {evidenceError && <p role="alert" className="text-sm text-error">{t("validation.evidence")}</p>}
              </div>
            )}
            <ReasonForm
              key={decision}
              label={t(form.label)}
              placeholder={t(form.placeholder)}
              submitLabel={t(form.submit)}
              onCancel={() => setOpen(false)}
              onSubmit={submit}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
