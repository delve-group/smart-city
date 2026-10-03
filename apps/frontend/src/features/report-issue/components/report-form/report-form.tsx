import { ArrowLeft, MapPin, X } from "@appica/icons-react";
import { Alert, AlertDescription } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@appica/ui-react/field";
import { Input } from "@appica/ui-react/input";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Textarea } from "@appica/ui-react/textarea";
import { useState, type FormEvent } from "react";
import type { Category } from "@/api/categories/types";
import type { ReverseAddress } from "@/api/photon/types";
import { createReport } from "@/api/reports/create-report";
import { createReportInputSchema, type CityReport, type ReportSeverity } from "@/api/reports/types";
import { FloatingPanel } from "@/shared/components/floating-panel/floating-panel";
import { CategoryField } from "../category-field/category-field";
import { SeverityField } from "../severity-field/severity-field";

type ReportFormProps = {
  categories: readonly Category[];
  location: { lat: number; lng: number };
  address: ReverseAddress;
  onChangeLocation: () => void;
  onCancel: () => void;
  onSubmitted: (report: CityReport) => void;
};

type Errors = Partial<Record<"category_id" | "title" | "description", string>>;

const DESCRIPTION_MAX = 1000;

export function ReportForm({ categories, location, address, onChangeLocation, onCancel, onSubmitted }: ReportFormProps) {
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<ReportSeverity>("medium");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const parsed = createReportInputSchema.safeParse({
      category_id: categoryId,
      title,
      description,
      severity,
      lat: location.lat,
      lng: location.lng,
      address: address.address,
      district: address.district,
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      onSubmitted(await createReport(parsed.data));
    } catch (error) {
      // Keep everything the user typed; they can retry.
      setSubmitError(error instanceof Error ? error.message : "Could not submit the report.");
      setSubmitting(false);
    }
  }

  return (
    <FloatingPanel
      labelledBy="report-form-title"
      header={
        <div className="flex items-center justify-between gap-3">
          <h2 id="report-form-title" className="text-lg font-semibold text-foreground-intense">Report an issue</h2>
          <Button variant="ghost" size="icon-md" aria-label="Cancel report" onClick={onCancel}>
            <X />
          </Button>
        </div>
      }
    >
      <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-5 px-5 py-5">
            <div className="flex items-start gap-3 rounded-md bg-background-muted p-3">
              <MapPin size={18} aria-hidden className="mt-0.5 shrink-0 text-foreground-muted" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium text-foreground-intense">{address.address}</span>
                {address.district && <span className="text-xs text-foreground-muted">{address.district}, Kraków</span>}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={onChangeLocation}>
                <ArrowLeft data-icon="start" />
                Change
              </Button>
            </div>

            <CategoryField categories={categories} value={categoryId} error={errors.category_id} onChange={setCategoryId} />

            <Field invalid={Boolean(errors.title)}>
              <FieldLabel>What is wrong?</FieldLabel>
              <Input
                inputSize="lg"
                value={title}
                maxLength={80}
                placeholder="e.g. Street light out by the tram stop"
                onChange={(event) => setTitle(event.target.value)}
              />
              <FieldError match={Boolean(errors.title)}>{errors.title}</FieldError>
            </Field>

            <Field invalid={Boolean(errors.description)}>
              <FieldLabel>Details (optional)</FieldLabel>
              <Textarea
                value={description}
                rows={4}
                maxLength={DESCRIPTION_MAX}
                placeholder="Since when? What exactly is affected? Anything a crew should know?"
                onChange={(event) => setDescription(event.target.value)}
              />
              <FieldDescription>{description.length} / {DESCRIPTION_MAX}</FieldDescription>
              <FieldError match={Boolean(errors.description)}>{errors.description}</FieldError>
            </Field>

            <SeverityField value={severity} onChange={setSeverity} />

            {submitError && (
              <Alert variant="error">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>
        <footer className="flex gap-2 border-t border-border-muted px-5 py-4">
          <Button type="button" variant="outline" size="lg" onClick={onCancel}>Cancel</Button>
          <Button type="submit" size="lg" className="flex-1" disabled={submitting}>
            {submitting ? "Sending…" : "Send report"}
          </Button>
        </footer>
      </form>
    </FloatingPanel>
  );
}
