import { ArrowLeft, MapPin, X } from "@appica/icons-react";
import { Alert, AlertDescription } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { Field, FieldDescription, FieldLabel } from "@appica/ui-react/field";
import { Fieldset } from "@appica/ui-react/fieldset";
import { Input } from "@appica/ui-react/input";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Textarea } from "@appica/ui-react/textarea";
import type { Category } from "@/api/categories/types";
import type { IntakeController } from "../../hooks/use-intake-draft";
import { FloatingPanel } from "@/shared/components/floating-panel/floating-panel";
import { CategoryField } from "../category-field/category-field";
import { SeverityField } from "../severity-field/severity-field";
import { ObservationFields } from "../observation-fields/observation-fields";
import { ReportOutcome } from "../report-outcome/report-outcome";
import { USE_MOCKS } from "@/api/mocks/use-mocks";

type Props = { categories: readonly Category[]; intake: IntakeController; onChangeLocation: () => void; onCancel: () => void; onNew: () => void };

export function ReportForm({ categories, intake, onChangeLocation, onCancel, onNew }: Props) {
  const { fields, draft, report, busy, saving, dirty, edit } = intake;
  const blocked = busy || saving;
  const confirmed = Boolean(draft && !dirty && !intake.needsRecovery && draft.confirmation?.revision === draft.revision);
  const saved = report ?? (draft?.submission ? { ...draft.submission, resident_next_step: null } : null);
  return (
    <FloatingPanel labelledBy="report-form-title" header={
      <div className="flex items-center justify-between gap-3">
        <h2 id="report-form-title" className="text-lg font-semibold text-foreground-intense">{saved ? "Your report" : "Create a report"}</h2>
        <Button variant="ghost" size="icon-md" aria-label="Close report" onClick={onCancel} disabled={busy}><X /></Button>
      </div>
    }>
      <form noValidate onSubmit={(event) => { event.preventDefault(); void (confirmed ? intake.submit() : intake.review()); }} className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-5 px-5 py-5">
            {saved ? <ReportOutcome report={saved} busy={busy} onRefresh={() => void intake.recover(false)} onNew={onNew} /> : (
              <>
                <div className="flex items-start gap-3 rounded-md bg-background-muted p-3">
                  <MapPin size={18} aria-hidden className="mt-0.5 shrink-0 text-foreground-muted" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium text-foreground-intense">{fields.location?.label ?? "Choose a location"}</span>
                    <span className="text-xs text-foreground-muted">{fields.location?.district ? `${fields.location.district}, ` : ""}Kraków</span>
                  </div>
                  <Button variant="ghost" size="sm" disabled={blocked} onClick={onChangeLocation}><ArrowLeft data-icon="start" />Change</Button>
                </div>
                <p aria-live="polite" className="text-xs text-foreground-muted">
                  {USE_MOCKS ? "UI mock · stored in this browser." : "Guest · unverified."} {saving ? "Saving draft…" : dirty ? "Unsaved edits — review to save, or wait for automatic save." : "Draft saved; it can be recovered after refresh."}
                </p>
                <Fieldset disabled={busy} className="gap-5">
                  <CategoryField categories={categories} value={fields.category_id ?? ""} autoFocus onChange={(category_id) => edit({ category_id, issue_type: null })} />
                  <Field>
                    <FieldLabel>What is wrong?</FieldLabel>
                    <Input inputSize="lg" value={fields.title ?? ""} maxLength={80} placeholder="e.g. Power outage in my building" onChange={(event) => edit({ title: event.target.value || null })} />
                    <FieldDescription>English summary for city review. Preserve original Polish observations below.</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel>Original observation (optional)</FieldLabel>
                    <Textarea value={fields.description ?? ""} rows={4} maxLength={1000} onChange={(event) => edit({ description: event.target.value })} />
                    <FieldDescription>{fields.description?.length ?? 0} / 1000 · Private to you and authorized city staff.</FieldDescription>
                  </Field>
                  <ObservationFields fields={fields} issueTypes={intake.issueTypes} onEdit={edit} />
                  <SeverityField value={fields.severity} onChange={(severity) => edit({ severity })} />
                </Fieldset>
                {draft && !dirty && (
                  <section aria-labelledby="readback-title" className="flex flex-col gap-3 rounded-md border border-border p-3">
                    <h3 id="readback-title" className="font-medium text-foreground-intense">Review summary and location</h3>
                    <p className="text-sm">{draft.readback_summary}</p>
                    {draft.missing_fields.length > 0 ? <p className="text-sm text-warning-emphasis">Still needed: {draft.missing_fields.map((field) => MISSING_LABELS[field]).join(", ")}.</p> : (
                      <Button variant="outline" focusableWhenDisabled disabled={blocked || confirmed || intake.needsRecovery} onClick={() => void intake.confirm()}>
                        {confirmed ? "Summary and location confirmed" : "Confirm summary and location"}
                      </Button>
                    )}
                  </section>
                )}
              </>
            )}
            {intake.error && <Alert variant="error"><AlertDescription>{intake.error}</AlertDescription></Alert>}
            {intake.needsRecovery && draft && <Button variant="outline" disabled={blocked} onClick={() => void intake.recover()}>Check current draft (keep my edits)</Button>}
            {intake.storageWarning && <p className="text-sm text-warning-emphasis">Browser recovery storage is blocked. Keep this window open until you receive a saved reference.</p>}
          </div>
        </ScrollArea>
        {!saved && <footer className="flex gap-2 border-t border-border-muted px-5 py-4">
          <Button variant="outline" size="lg" onClick={onCancel} disabled={busy}>Close</Button>
          <Button type="submit" size="lg" className="flex-1" focusableWhenDisabled disabled={blocked || intake.needsRecovery}>
            {busy ? "Working…" : saving ? "Saving draft…" : confirmed ? "Send report" : "Review report"}
          </Button>
        </footer>}
      </form>
    </FloatingPanel>
  );
}

const MISSING_LABELS = { category_id: "category", issue_type: "issue type", title: "summary", location: "location" };
