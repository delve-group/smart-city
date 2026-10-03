import { z } from "zod";
import { USE_MOCKS } from "@/api/mocks/use-mocks";
import { IntakeError, requestIntake } from "@/api/intake/request-intake";

/** Mock mode deliberately offers the form, never a simulated provider conversation. */
export function requestVoice<T>(path: string, schema: z.ZodType<T>, options: RequestInit) {
  if (USE_MOCKS) return Promise.reject(new IntakeError("voice_unavailable", "Voice is unavailable in the UI preview. Use the form."));
  return requestIntake(path, schema, {
    ...options,
    cache: "no-store",
    signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
  });
}
