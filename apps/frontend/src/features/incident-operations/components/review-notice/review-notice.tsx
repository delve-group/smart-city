"use client";

import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import type { Review } from "@/api/operations/types";
import { translateServerText, useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";

const TITLE: Partial<Record<Review["reason"], MessageKey>> = {
  urgent: "reviewTitle.urgent",
  ticket_rejected: "reviewTitle.ticket_rejected",
  needs_responsibility: "reviewTitle.needs_responsibility",
  needs_link: "reviewTitle.needs_link",
  private_scope: "reviewTitle.private_scope",
  pending_triage: "reviewTitle.pending_triage",
  assessment_pending: "reviewTitle.assessment_pending",
  assessment_review: "reviewTitle.assessment_review",
};

/** Why the record is waiting for the official. A ready proposal speaks for itself. */
export function ReviewNotice({ review }: { review: Review }) {
  const { t } = useI18n();
  const title = TITLE[review.reason];
  if (!title) return null;
  const variant = review.reason === "urgent" ? "error" : review.reason === "ticket_rejected" ? "warning" : "default";
  return (
    <Alert variant={variant}>
      <AlertTitle as="h3">{t(title)}</AlertTitle>
      <AlertDescription className="text-pretty">{translateServerText(t, review.note)}</AlertDescription>
    </Alert>
  );
}
