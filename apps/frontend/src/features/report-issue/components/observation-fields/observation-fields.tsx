import { Field, FieldDescription, FieldLabel } from "@appica/ui-react/field";
import { Input } from "@appica/ui-react/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@appica/ui-react/select";
import { Checkbox } from "@appica/ui-react/checkbox";
import type { DraftFields, ReportScope } from "@/api/intake/types";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";

type Props = { fields: DraftFields; onEdit: (patch: Partial<DraftFields>) => void };

export function ObservationFields({ fields, onEdit }: Props) {
  const { t } = useI18n();
  const scopes = SCOPES.map((scope) => ({ value: scope, label: t(`scope.${scope}` as MessageKey) }));
  return (
    <>
      <Field>
        <FieldLabel>{t("report.scope")}</FieldLabel>
        <Select items={scopes} value={fields.scope} onValueChange={(scope) => onEdit({ scope: scope as ReportScope })} size="lg">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{scopes.map((scope) => <SelectItem key={scope.value} value={scope.value}>{scope.label}</SelectItem>)}</SelectContent>
        </Select>
        {fields.scope === "unit" && <FieldDescription>{t("report.scopeUnitHint")}</FieldDescription>}
      </Field>
      {fields.scope === "unit" && fields.location && (
        <Field>
          <FieldLabel>{t("report.unit")}</FieldLabel>
          <Input value={fields.location.unit ?? ""} maxLength={40} onChange={(event) => onEdit({ location: { ...fields.location!, unit: event.target.value || null } })} />
        </Field>
      )}
      <label className="flex items-start gap-3 text-sm">
        <Checkbox checked={fields.urgent} onCheckedChange={(urgent) => onEdit({ urgent })} aria-labelledby="urgent-label" aria-describedby="urgent-help" />
        <span><span id="urgent-label">{t("report.urgent")}</span> <span id="urgent-help">{t("report.urgentHint")}</span></span>
      </label>
    </>
  );
}

const SCOPES: readonly ReportScope[] = ["unknown", "unit", "building", "street"];
