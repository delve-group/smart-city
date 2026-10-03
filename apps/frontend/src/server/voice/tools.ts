import "server-only";
import { z } from "zod";
import type { ActorContext } from "@/server/actor-context";
import type { VoiceToolInput } from "@/api/voice/types";
import { locationCandidateSchema } from "@/api/locations/types";
import { resolveLocation } from "@/server/location/resolve-location";
import { getPool } from "@/server/db";
import { ApiError } from "@/server/http/api";
import { confirmDraft, getDraft, updateDraft } from "@/server/reports/drafts";
import { submitDraft } from "@/server/reports/submission";
import { searchRecords } from "@/server/search/service";
import { requireVoiceSession } from "./sessions";

/** Transport only: shared domain services retain ownership, revision and submission authority. */
export async function runVoiceTool(ctx: ActorContext, sessionId: string, input: VoiceToolInput, signal = AbortSignal.timeout(10_000)) {
  const session = await requireVoiceSession(ctx, sessionId);
  switch (input.operation) {
    case "resolve_location": {
      const result = await resolveLocation({ city: "Kraków", address: input.address }, signal);
      const stored = await getPool().query("UPDATE voice_sessions SET location_candidates = $1 WHERE id = $2 AND ended_at IS NULL AND expires_at > now() RETURNING id", [JSON.stringify(result.candidates), session.id]);
      if (!stored.rowCount) throw new ApiError(409, "voice_session_ended", "Voice ended during the location lookup. Continue with the form.");
      return result;
    }
    case "find_incidents": return searchRecords(ctx, { q: input.query, mode: "hybrid", record_type: ["incident"], limit: 5 });
    case "prepare_report": {
      const fields = { ...input.fields };
      const candidates = z.array(locationCandidateSchema).parse(session.location_candidates);
      const candidate = input.candidate_id ? candidates.find((value) => value.candidate_id === input.candidate_id) : undefined;
      if (input.candidate_id && !candidate) throw new ApiError(400, "invalid_request", "Select a candidate returned by the current location lookup. Do not invent coordinates.");
      const location = candidate ? { ...candidate, unit: input.unit ?? null }
        : input.unit !== undefined ? (await getDraft(ctx, session.draft_id)).fields.location : undefined;
      if (input.unit !== undefined && !location) throw new ApiError(400, "invalid_request", "Select a location before adding a unit.");
      // Location authority is bounded to the last actual resolver response.
      return updateDraft(ctx, session.draft_id, { expected_revision: input.expected_revision,
        fields: location ? { ...fields, location: { ...location, unit: input.unit === undefined ? location.unit : input.unit } } : fields });
    }
    case "confirm_report_draft": return confirmDraft(ctx, session.draft_id, { revision: input.revision, channel: "voice" });
    case "submit_report": return submitDraft(ctx, { draft_id: session.draft_id, revision: input.revision });
  }
}
