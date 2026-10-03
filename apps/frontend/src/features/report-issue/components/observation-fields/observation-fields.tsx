import { Field, FieldDescription, FieldLabel } from "@appica/ui-react/field";
import { Input } from "@appica/ui-react/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@appica/ui-react/select";
import { Checkbox } from "@appica/ui-react/checkbox";
import { Button } from "@appica/ui-react/button";
import type { DraftFields, IssueType, ReportScope } from "@/api/intake/types";

type Props = { fields: DraftFields; issueTypes: readonly IssueType[]; onEdit: (patch: Partial<DraftFields>) => void };

export function ObservationFields({ fields, issueTypes, onEdit }: Props) {
  const types = issueTypes.filter((item) => item.category_id === null || item.category_id === fields.category_id);
  return (
    <>
      <Field>
        <FieldLabel>Issue type</FieldLabel>
        <Select items={types.map((item) => ({ value: item.id, label: item.label }))} value={fields.issue_type} onValueChange={(value) => onEdit({ issue_type: value as string | null })} size="lg">
          <SelectTrigger><SelectValue placeholder="Choose the kind of issue" /></SelectTrigger>
          <SelectContent>{types.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>What is affected?</FieldLabel>
        <Select items={SCOPES} value={fields.scope} onValueChange={(scope) => onEdit({ scope: scope as ReportScope })} size="lg">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SCOPES.map((scope) => <SelectItem key={scope.value} value={scope.value}>{scope.label}</SelectItem>)}</SelectContent>
        </Select>
        <FieldDescription>Apartment-only observations stay private for scope review.</FieldDescription>
      </Field>
      {fields.scope === "unit" && fields.location && (
        <Field>
          <FieldLabel>Apartment or unit (private, optional)</FieldLabel>
          <Input value={fields.location.unit ?? ""} maxLength={40} onChange={(event) => onEdit({ location: { ...fields.location!, unit: event.target.value || null } })} />
        </Field>
      )}
      <Field>
        <FieldLabel>Observation time</FieldLabel>
        <Input type="datetime-local" value={localTime(fields.observed_at)} onChange={(event) => {
          const value = event.target.value;
          onEdit({ observed_at: value ? new Date(value).toISOString() : null, observed_time_state: value ? "known" : "unknown" });
        }} />
        <FieldDescription>{fields.observed_time_state === "unknown" ? "Unknown — no time is inferred from submission." : "Your local time; stored in UTC."}</FieldDescription>
        {fields.observed_at && <Button variant="ghost" onClick={() => onEdit({ observed_at: null, observed_time_state: "unknown" })}>Use unknown time</Button>}
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox checked={fields.urgent} onCheckedChange={(urgent) => onEdit({ urgent })} aria-labelledby="urgent-label" aria-describedby="urgent-help" />
        <span><span id="urgent-label">Immediate danger reported.</span> <span id="urgent-help">Contact emergency services for immediate help; this report does not dispatch responders.</span></span>
      </label>
    </>
  );
}

const SCOPES = [
  { value: "unknown", label: "Unknown — needs clarification" },
  { value: "unit", label: "My apartment or unit only" },
  { value: "building", label: "The building" },
  { value: "street", label: "The street" },
];

function localTime(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}
