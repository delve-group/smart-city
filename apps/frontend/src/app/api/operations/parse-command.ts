import type { z } from "zod";
import { ApiError } from "@/server/http/api";

/** Reads and validates a JSON command body; the first issue becomes the error message. */
export async function parseCommand<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid request.");
  return parsed.data;
}
