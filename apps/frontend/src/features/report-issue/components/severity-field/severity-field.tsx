"use client";

import { Radio } from "@appica/ui-react/radio";
import { RadioGroup } from "@appica/ui-react/radio-group";
import { REPORT_SEVERITIES, type ReportSeverity } from "@/shared/utils/severity";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";

type SeverityFieldProps = { value: ReportSeverity | null; onChange: (severity: ReportSeverity) => void };

export function SeverityField({ value, onChange }: SeverityFieldProps) {
  const { t } = useI18n();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend id="severity-label" className="mb-2 text-sm font-medium text-foreground-intense">{t("severity.legend")}</legend>
      <RadioGroup aria-labelledby="severity-label" value={value ?? ""} onValueChange={(next) => onChange(next as ReportSeverity)} className="gap-2">
        {REPORT_SEVERITIES.map((severity) => (
          <label
            key={severity}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors duration-150 select-none hover:bg-background-subtle has-data-checked:border-primary has-data-checked:bg-primary-subtle"
          >
            <Radio value={severity} aria-labelledby={`severity-${severity}`} className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span id={`severity-${severity}`} className="text-sm font-medium text-foreground-intense">{t(`severity.${severity}` as MessageKey)}</span>
              <span className="text-xs text-foreground-muted">{t(`severity.${severity}Hint` as MessageKey)}</span>
            </span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
