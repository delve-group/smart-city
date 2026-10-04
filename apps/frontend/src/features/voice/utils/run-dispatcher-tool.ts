import { getDraft } from "@/api/intake/get-draft";
import { runVoiceTool } from "@/api/voice/run-voice-tool";
import { voiceToolSchema } from "@/api/voice/types";
import type { IntakeDraft, Report } from "@/api/intake/types";
import { IntakeError } from "@/api/intake/request-intake";
import type { LocationPreview } from "@/api/locations/types";

type DraftReceiver = (draft: IntakeDraft | null, report?: Report) => Promise<boolean>;

function readback(draft: IntakeDraft) {
  return { revision: draft.revision, fields: draft.fields, missing_fields: draft.missing_fields,
    readback_summary: draft.readback_summary, confirmation: draft.confirmation, submission: draft.submission };
}

/** SDK-facing dispatcher adapter. No browser/model value can select its actor or draft. */
export async function runDispatcherTool(
  sessionId: string, draftId: string, operation: string, parameters: Record<string, unknown>, receive: DraftReceiver,
  previewLocation?: (location: LocationPreview | null) => void,
) {
  const parsed = voiceToolSchema.safeParse({ ...parameters, operation,
    ...(operation === "prepare_report" && parameters.unit === "" ? { unit: null } : {}) });
  if (!parsed.success) return JSON.stringify({ error: "invalid_request", message: "Use only the documented tool fields and current draft revision; do not invent coordinates or authority." });
  try {
    const result = await runVoiceTool(sessionId, parsed.data);
    if ("revision" in result) {
      const accepted = await receive(result);
      if (accepted && operation === "prepare_report" && result.fields.location) {
        const { lat, lng, label } = result.fields.location;
        previewLocation?.({ lat, lng, label });
      }
      return JSON.stringify(readback(result));
    }
    if ("report" in result) {
      await receive(null, result.report);
      // Reconcile the same draft even when its submission response arrives after a disconnect.
      try { await receive(await getDraft(draftId, AbortSignal.timeout(15_000)), result.report); }
      catch { /* The successful response already proves the committed reference. */ }
      return JSON.stringify({ reference: result.report.reference, replayed: result.replayed, triage_state: result.report.triage_state,
        message: "Saved. Assessment/response progress is separate; do not invent an institution or ETA." });
    }
    if ("candidates" in result) {
      const candidate = result.candidates[0];
      previewLocation?.(candidate ? { lat: candidate.lat, lng: candidate.lng, label: candidate.label, bounds: result.matched_place?.bounds ?? null } : null);
      return JSON.stringify({ ...result, map_preview: candidate ? { candidate_id: candidate.candidate_id, label: candidate.label,
        provisional: result.status === "ambiguous" } : null });
    }
    return JSON.stringify(result);
  } catch (failure) {
    const error = failure instanceof IntakeError ? failure.code : "unavailable";
    if (["prepare_report", "confirm_report_draft", "submit_report"].includes(operation)) {
      try {
        const saved = await getDraft(draftId, AbortSignal.timeout(15_000));
        await receive(saved);
        return JSON.stringify({ error, current_draft: readback(saved),
          message: saved.submission ? "The report is already committed. Announce its actual reference; do not submit another report."
            : "Operation failed. Check this recovered current draft internally against the resident's facts and reporting intent. Follow the system prompt for agreement; do not read the full ticket aloud. Use the actual recovered revision/confirmation and reconcile submission identity before retrying. Do not blindly retry." });
      } catch { return JSON.stringify({ error: "outcome_unknown", message: "The outcome is unknown. Stop and use the form to recover this same draft before retrying. Do not announce success." }); }
    }
    if (operation === "resolve_location") previewLocation?.(null);
    return JSON.stringify({ error, message: "The tool is unavailable. Continue clarification or use the form; do not invent a result." });
  }
}
