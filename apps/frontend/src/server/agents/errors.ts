export type AssessmentErrorCode =
  | "invalid_assessment_input"
  | "invalid_assessment_output"
  | "provider_unavailable"
  | "provider_rejected"
  | "provider_timeout"
  | "assessment_cancelled";

/** Safe to record or display; never carries provider bodies, credentials or input text. */
export class AssessmentError extends Error {
  constructor(
    public readonly code: AssessmentErrorCode,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AssessmentError";
  }
}
