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
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { CategoryField } from "../category-field/category-field";
import { SeverityField } from "../severity-field/severity-field";
import { ObservationFields } from "../observation-fields/observation-fields";
import { ReportOutcome } from "../report-outcome/report-outcome";
import { USE_MOCKS } from "@/api/mocks/use-mocks";

type Props = { categories: readonly Category[]; intake: IntakeController; onChangeLocation: () => void; onCancel: () => void; onNew: () => void };

const MISSING_KEYS = {
  category_id: "missing.category_id",
  issue_type: "missing.issue_type",
  title: "missing.title",
  location: "missing.location",
} as const satisfies Record<string, MessageKey>;

export function ReportForm({ categories, intake, onChangeLocation, onCancel, onNew }: Props) {
  const { t } = useI18n();
  const { fields, draft, report, busy, saving, dirty, edit } = intake;
  const blocked = busy || saving;
  const confirmed = Boolean(draft && !dirty && !intake.needsRecovery && draft.confirmation?.revision === draft.revision);
  const saved = report ?? (draft?.submission ? { ...draft.submission, resident_next_step: null } : null);
  return (
    <FloatingPanel labelledBy="report-form-title" header={
      <div className="flex items-center justify-between gap-3">
        <h2 id="report-form-title" className="text-lg font-semibold text-foreground-intense">{saved ? t("report.yours") : t("report.create")}</h2>
        <Button variant="ghost" size="icon-md" aria-label={t("report.closeAria")} onClick={onCancel} disabled={busy}><X /></Button>
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
                    <span className="text-sm font-medium text-foreground-intense">{fields.location?.label ?? t("report.chooseLocation")}</span>
                    <span className="text-xs text-foreground-muted">{fields.location?.district ? `${fields.location.district}, ` : ""}Kraków</span>
                  </div>
                  <Button variant="ghost" size="sm" disabled={blocked} onClick={onChangeLocation}><ArrowLeft data-icon="start" />{t("common.change")}</Button>
                </div>
                <p aria-live="polite" className="text-xs text-foreground-muted">
                  {USE_MOCKS ? t("report.mockNotice") : t("report.guestNotice")} {saving ? t("report.savingDraft") : dirty ? t("report.unsaved") : t("report.draftSaved")}
                </p>
                <Fieldset disabled={busy} className="gap-5">
                  <CategoryField categories={categories} value={fields.category_id ?? ""} autoFocus onChange={(category_id) => edit({ category_id, issue_type: null })} />
                  <Field>
                    <FieldLabel>{t("report.what")}</FieldLabel>
                    <Input inputSize="lg" value={fields.title ?? ""} maxLength={80} placeholder={t("report.whatPlaceholder")} onChange={(event) => edit({ title: event.target.value || null })} />
                    <FieldDescription>{t("report.summaryHint")}</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel>{t("report.original")}</FieldLabel>
                    <Textarea value={fields.description ?? ""} rows={4} maxLength={1000} onChange={(event) => edit({ description: event.target.value })} />
                    <FieldDescription>{t("report.originalHint", { count: fields.description?.length ?? 0 })}</FieldDescription>
                  </Field>
                  <ObservationFields fields={fields} issueTypes={intake.issueTypes} onEdit={edit} />
                  <SeverityField value={fields.severity} onChange={(severity) => edit({ severity })} />
                </Fieldset>
                {draft && !dirty && (
                  <section aria-labelledby="readback-title" className="flex flex-col gap-3 rounded-md border border-border p-3">
                    <h3 id="readback-title" className="font-medium text-foreground-intense">{t("report.reviewTitle")}</h3>
                    <p className="text-sm">{draft.readback_summary}</p>
                    {draft.missing_fields.length > 0 ? <p className="text-sm text-warning-emphasis">{t("report.stillNeeded", { fields: draft.missing_fields.map((field) => t(MISSING_KEYS[field])).join(", ") })}</p> : (
                      <Button variant="outline" focusableWhenDisabled disabled={blocked || confirmed || intake.needsRecovery} onClick={() => void intake.confirm()}>
                        {confirmed ? t("report.confirmedSummary") : t("report.confirmSummary")}
                      </Button>
                    )}
                  </section>
                )}
              </>
            )}
            {intake.error && <Alert variant="error"><AlertDescription>{intake.error}</AlertDescription></Alert>}
            {intake.needsRecovery && draft && <Button variant="outline" disabled={blocked} onClick={() => void intake.recover()}>{t("report.checkDraft")}</Button>}
            {intake.storageWarning && <p className="text-sm text-warning-emphasis">{t("report.storageBlocked")}</p>}
          </div>
        </ScrollArea>
        {!saved && <footer className="flex gap-2 border-t border-border-muted px-5 py-4">
          <Button variant="outline" size="lg" onClick={onCancel} disabled={busy}>{t("report.close")}</Button>
          <Button type="submit" size="lg" className="flex-1" focusableWhenDisabled disabled={blocked || intake.needsRecovery}>
            {busy ? t("report.working") : saving ? t("report.savingDraft") : confirmed ? t("report.send") : t("report.review")}
          </Button>
        </footer>}
      </form>
    </FloatingPanel>
  );
}
