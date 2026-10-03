/** Pure error value shared by domain rules and HTTP boundaries. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryable = false,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}
