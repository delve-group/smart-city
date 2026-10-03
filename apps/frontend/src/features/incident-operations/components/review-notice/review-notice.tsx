import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import type { Review } from "@/api/operations/types";

const TITLE: Partial<Record<Review["reason"], string>> = {
  urgent: "Possible danger",
  ticket_rejected: "Rejected by the institution",
  needs_responsibility: "Needs a responsible institution",
  needs_link: "Which incident does this belong to?",
  private_scope: "Apartment-only report",
  pending_triage: "Automatic triage did not finish",
};

/** Why the record is waiting for the official. A ready proposal speaks for itself. */
export function ReviewNotice({ review }: { review: Review }) {
  const title = TITLE[review.reason];
  if (!title) return null;
  const variant = review.reason === "urgent" ? "error" : review.reason === "ticket_rejected" ? "warning" : "default";
  return (
    <Alert variant={variant}>
      <AlertTitle as="h3">{title}</AlertTitle>
      <AlertDescription className="text-pretty">{review.note}</AlertDescription>
    </Alert>
  );
}
