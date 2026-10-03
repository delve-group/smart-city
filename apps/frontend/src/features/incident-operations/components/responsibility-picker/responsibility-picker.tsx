import { Button } from "@appica/ui-react/button";
import { Radio } from "@appica/ui-react/radio";
import { RadioGroup } from "@appica/ui-react/radio-group";
import { useState } from "react";
import type { Category } from "@/api/categories/types";
import type { Incident, Institution } from "@/api/operations/types";
import { InfoHint } from "@/shared/components/info-hint/info-hint";

type ResponsibilityPickerProps = {
  incident: Incident;
  category: Category | undefined;
  institutions: readonly Institution[];
  onChoose: (institutionId: string) => Promise<boolean>;
};

/** Pick the institution when routing found none, or the previous one rejected the work. */
export function ResponsibilityPicker({ incident, category, institutions, onChoose }: ResponsibilityPickerProps) {
  // Mapped institutions first; the others stay selectable for cases the mapping does not cover.
  const sorted = [...institutions].sort(
    (a, b) => Number(b.categoryIds.includes(incident.categoryId)) - Number(a.categoryIds.includes(incident.categoryId)),
  );
  const rejectedBy = incident.ticket?.status === "rejected" ? incident.ticket.institutionId : null;
  // Preselect only an obvious answer: mapped to the category and not the one that just said no.
  const [value, setValue] = useState(
    () => sorted.find((institution) => institution.categoryIds.includes(incident.categoryId) && institution.id !== rejectedBy)?.id ?? "",
  );
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function prepare() {
    if (!value) {
      setError(true);
      return;
    }
    setBusy(true);
    await onChoose(value);
    setBusy(false);
  }

  return (
    <section aria-labelledby="responsibility-title" className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        <h3 id="responsibility-title" className="text-sm font-semibold text-foreground-intense">
          Who should respond?
        </h3>
        <InfoHint label="How choosing works">
          Your choice becomes a proposal; nothing is sent until you approve it. If none of them is responsible, leave the
          incident in review.
        </InfoHint>
      </div>
      <RadioGroup aria-labelledby="responsibility-title" value={value} onValueChange={(next) => {
          setValue(next as string);
          setError(false);
        }} className="gap-2">
        {sorted.map((institution) => {
          const mapped = institution.categoryIds.includes(incident.categoryId);
          const hint =
            institution.id === rejectedBy
              ? "Rejected this incident before"
              : mapped
                ? `Handles ${category?.label ?? incident.categoryId}`
                : "Not mapped to this category";
          return (
            <label
              key={institution.id}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors duration-150 select-none hover:bg-background-subtle has-data-checked:border-primary has-data-checked:bg-primary-subtle"
            >
              <Radio value={institution.id} aria-labelledby={`institution-${institution.id}`} className="mt-0.5" />
              <span className="flex flex-col gap-0.5">
                <span id={`institution-${institution.id}`} className="text-sm font-medium text-foreground-intense">
                  {institution.name}
                </span>
                <span className="text-xs text-foreground-muted">{hint}</span>
              </span>
            </label>
          );
        })}
      </RadioGroup>
      {error && (
        <p role="alert" className="text-sm text-error">
          Choose an institution first.
        </p>
      )}
      <Button onClick={prepare} disabled={busy}>
        {busy ? "Preparing…" : "Prepare ticket proposal"}
      </Button>
    </section>
  );
}
