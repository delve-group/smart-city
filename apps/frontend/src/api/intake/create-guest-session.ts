import { z } from "zod";
import { requestIntake } from "./request-intake";

const sessionSchema = z.object({
  actor: z.object({ id: z.string(), role: z.literal("resident"), identity_kind: z.literal("guest"), institution_id: z.null() }),
  expires_at: z.iso.datetime({ offset: true }),
});
export function createGuestSession() {
  return requestIntake("/api/auth/guest", sessionSchema, { method: "POST" });
}
