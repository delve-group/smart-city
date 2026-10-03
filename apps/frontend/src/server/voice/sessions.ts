import "server-only";
import { z } from "zod";
import type { ActorContext } from "@/server/actor-context";
import { getPool, withTransaction } from "@/server/db";
import { ApiError } from "@/server/http/api";
import { getDraft, loadOwnedDraft, requireResident } from "@/server/reports/drafts";
import { getVoiceConfig } from "./config";
import { getConversationCredential, requestProvider } from "./provider";
import { ConfigurationError } from "@/server/config";
import { dispatcherAgentSchema, verifyPreparedDispatcher } from "./dispatcher-agent";

interface VoiceSessionRow { id: string; draft_id: string; expires_at: Date; ended_at: Date | null; location_candidates: unknown }

/** Short database reservation serializes starts; provider requests never hold a transaction. */
export async function createVoiceSession(ctx: ActorContext, draftId: string, signal?: AbortSignal) {
  const owner = requireResident(ctx);
  const config = getVoiceConfig();
  const session = await withTransaction(async (client) => {
    await client.query("SELECT id FROM actors WHERE id = $1 FOR UPDATE", [owner.id]);
    const draft = await loadOwnedDraft(client, owner.id, draftId);
    if (draft.report_id) throw new ApiError(409, "draft_submitted", "This report is already saved. Start a new report for another observation.");
    await client.query("UPDATE voice_sessions SET ended_at = now() WHERE owner_id = $1 AND ended_at IS NULL AND expires_at <= now()", [owner.id]);
    const active = await client.query("SELECT 1 FROM voice_sessions WHERE owner_id = $1 AND ended_at IS NULL", [owner.id]);
    if (active.rowCount) throw new ApiError(429, "voice_session_active", "A voice session is already active. End it or use the form; it expires after five minutes.");
    const starts = await client.query<{ count: string }>("SELECT count(*) FROM voice_sessions WHERE owner_id = $1 AND created_at > now() - interval '10 minutes'", [owner.id]);
    if (Number(starts.rows[0].count) >= 5) throw new ApiError(429, "voice_start_limit", "Voice was started five times in ten minutes. Use the form or try again later.");
    const inserted = await client.query<VoiceSessionRow>(
      "INSERT INTO voice_sessions (owner_id, draft_id, agent_id, agent_version_id) VALUES ($1, $2, $3, $4) RETURNING id, draft_id, expires_at",
      [owner.id, draftId, config.agentId, config.versionId],
    );
    return inserted.rows[0];
  });
  try {
    const query = new URLSearchParams({ version_id: config.versionId });
    const dispatcher = await requestProvider(`/v1/convai/agents/${encodeURIComponent(config.agentId)}?${query}`, config.apiKey, dispatcherAgentSchema, { signal });
    const tools = dispatcher.conversation_config.agent.prompt.tool_ids;
    verifyPreparedDispatcher(dispatcher, tools);
    if (dispatcher.version_id !== config.versionId || tools.length !== 5 || new Set(tools).size !== 5) {
      throw new ConfigurationError("Voice requires the pinned integrated private dispatcher with five reviewed client tools. Run the explicit tool setup; the form remains available.");
    }
    const credential = await getConversationCredential(config, signal);
    const result = await getPool().query("UPDATE voice_sessions SET provider_conversation_id = $1 WHERE id = $2 AND ended_at IS NULL AND expires_at > now() RETURNING id", [credential.conversation_id, session.id]);
    if (!result.rowCount) throw new ApiError(409, "voice_session_ended", "This voice session ended before connecting. Use the form or start again.");
    return { id: session.id, draft_id: session.draft_id, expires_at: session.expires_at.toISOString(), conversation_token: credential.token };
  } catch (failure) {
    await endVoiceSession(ctx, session.id).catch(() => undefined);
    throw failure;
  }
}

export async function requireVoiceSession(ctx: ActorContext, sessionId: string) {
  const owner = requireResident(ctx);
  if (!z.uuid().safeParse(sessionId).success) throw new ApiError(404, "not_found", "Voice session not found.");
  const result = await getPool().query<VoiceSessionRow>("SELECT id, draft_id, expires_at, ended_at, location_candidates FROM voice_sessions WHERE id = $1 AND owner_id = $2", [sessionId, owner.id]);
  const session = result.rows[0];
  if (!session) throw new ApiError(404, "not_found", "Voice session not found.");
  if (session.ended_at || session.expires_at.getTime() <= Date.now()) throw new ApiError(409, "voice_session_ended", "Voice session ended. Your draft remains available in the form.");
  return session;
}

/** Idempotent local release; SDK/provider disconnect is verified separately. */
export async function endVoiceSession(ctx: ActorContext, sessionId: string) {
  const owner = requireResident(ctx);
  if (!z.uuid().safeParse(sessionId).success) throw new ApiError(404, "not_found", "Voice session not found.");
  const result = await getPool().query<{ draft_id: string }>("UPDATE voice_sessions SET ended_at = coalesce(ended_at, now()) WHERE id = $1 AND owner_id = $2 RETURNING draft_id", [sessionId, owner.id]);
  if (!result.rows[0]) throw new ApiError(404, "not_found", "Voice session not found.");
  return { ended: true, draft: await getDraft(ctx, result.rows[0].draft_id) };
}
