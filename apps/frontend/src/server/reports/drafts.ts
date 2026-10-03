import "server-only";

import type { PoolClient } from "pg";
import type { ActorContext } from "@/server/actor-context";
import type { Actor } from "@/server/auth/types";
import { recordAudit } from "@/server/audit/audit";
import { getPool, withTransaction } from "@/server/db";
import { ApiError } from "@/server/http/api";
import {
  draftFieldsSchema,
  EMPTY_DRAFT_FIELDS,
  type ConfirmationChannel,
  type DraftFieldsPatch,
  type IntakeDraft,
  type TriageState,
} from "./contracts";
import { mergeDraftFields, missingDraftFields, readbackSummary } from "./draft-rules";

export interface DraftRow {
  id: string;
  owner_id: string;
  revision: number;
  submission_key: string;
  fields: unknown;
  confirmed_revision: number | null;
  confirmation_channel: ConfirmationChannel | null;
  confirmed_at: Date | null;
  report_id: string | null;
  submitted_revision: number | null;
  created_at: Date;
  updated_at: Date;
  report_reference: string | null;
  report_triage_state: TriageState | null;
  report_submitted_at: Date | null;
}

const DRAFT_SELECT = `
  SELECT d.id, d.owner_id, d.revision, d.submission_key, d.fields, d.confirmed_revision, d.confirmation_channel,
         d.confirmed_at, d.report_id, d.submitted_revision, d.created_at, d.updated_at,
         r.reference AS report_reference, r.triage_state AS report_triage_state, r.submitted_at AS report_submitted_at
  FROM report_drafts d LEFT JOIN reports r ON r.id = d.report_id`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function notFound(what: string): ApiError {
  return new ApiError(404, "not_found", `This ${what} does not exist or is not yours.`);
}

/** Drafts belong to residents; staff accounts have no intake of their own. */
export function requireResident(ctx: ActorContext): Actor {
  if (ctx.kind !== "session" || ctx.actor.role !== "resident") {
    throw new ApiError(403, "forbidden", "Only a resident session can use report drafts.");
  }
  return ctx.actor;
}

export function projectDraft(row: DraftRow): IntakeDraft {
  const fields = draftFieldsSchema.parse(row.fields);
  return {
    id: row.id,
    revision: row.revision,
    submission_key: row.submission_key,
    fields,
    missing_fields: missingDraftFields(fields),
    readback_summary: readbackSummary(fields),
    confirmation: row.confirmed_revision && row.confirmation_channel && row.confirmed_at
      ? { revision: row.confirmed_revision, channel: row.confirmation_channel, confirmed_at: row.confirmed_at.toISOString() }
      : null,
    submission: row.report_id && row.report_reference && row.report_triage_state && row.report_submitted_at
      ? {
          report_id: row.report_id,
          reference: row.report_reference,
          triage_state: row.report_triage_state,
          submitted_at: row.report_submitted_at.toISOString(),
        }
      : null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

/** Another resident's draft is reported exactly like a missing one. */
export async function loadOwnedDraft(
  client: Pick<PoolClient, "query">,
  ownerId: string,
  draftId: string,
  lock = false,
): Promise<DraftRow> {
  if (!UUID.test(draftId)) throw notFound("draft");
  const result = await client.query<DraftRow>(
    `${DRAFT_SELECT} WHERE d.id = $1 AND d.owner_id = $2${lock ? " FOR UPDATE OF d" : ""}`,
    [draftId, ownerId],
  );
  if (!result.rows[0]) throw notFound("draft");
  return result.rows[0];
}

export async function createDraft(ctx: ActorContext, patch: DraftFieldsPatch = {}): Promise<IntakeDraft> {
  const owner = requireResident(ctx);
  const fields = mergeDraftFields(EMPTY_DRAFT_FIELDS, patch);
  return withTransaction(async (client) => {
    const inserted = await client.query<{ id: string }>(
      "INSERT INTO report_drafts (owner_id, fields) VALUES ($1, $2) RETURNING id",
      [owner.id, JSON.stringify(fields)],
    );
    await recordAudit(client, ctx, {
      operation: "report_draft.create",
      entity_type: "report_draft",
      entity_id: inserted.rows[0].id,
      outcome: "created",
    });
    return projectDraft(await loadOwnedDraft(client, owner.id, inserted.rows[0].id));
  });
}

export async function getDraft(ctx: ActorContext, draftId: string): Promise<IntakeDraft> {
  const owner = requireResident(ctx);
  return projectDraft(await loadOwnedDraft(getPool(), owner.id, draftId));
}

export async function updateDraft(
  ctx: ActorContext,
  draftId: string,
  input: { expected_revision: number; fields: DraftFieldsPatch },
): Promise<IntakeDraft> {
  const owner = requireResident(ctx);
  return withTransaction(async (client) => {
    const draft = await loadOwnedDraft(client, owner.id, draftId, true);
    if (draft.report_id) {
      throw new ApiError(409, "draft_submitted", "This draft was already submitted. Start a new report to add another observation.");
    }
    if (draft.revision !== input.expected_revision) {
      throw new ApiError(409, "version_conflict", "This draft changed. Load the latest revision.");
    }
    const fields = mergeDraftFields(draftFieldsSchema.parse(draft.fields), input.fields);
    // Any accepted edit withdraws the earlier confirmation: it covered a different revision.
    await client.query(
      `UPDATE report_drafts
       SET fields = $1, revision = revision + 1, confirmed_revision = NULL, confirmation_channel = NULL,
           confirmed_at = NULL, updated_at = now()
       WHERE id = $2 AND revision = $3`,
      [JSON.stringify(fields), draft.id, input.expected_revision],
    );
    return projectDraft(await loadOwnedDraft(client, owner.id, draft.id));
  });
}

export async function confirmDraft(
  ctx: ActorContext,
  draftId: string,
  input: { revision: number; channel: ConfirmationChannel },
): Promise<IntakeDraft> {
  const owner = requireResident(ctx);
  return withTransaction(async (client) => {
    const draft = await loadOwnedDraft(client, owner.id, draftId, true);
    if (draft.report_id) {
      throw new ApiError(409, "draft_submitted", "This draft was already submitted.");
    }
    if (draft.revision !== input.revision) {
      throw new ApiError(409, "version_conflict", "This draft changed. Read back the latest revision before confirming.");
    }
    // Confirming the same revision again keeps the first confirmation record.
    if (draft.confirmed_revision === draft.revision) return projectDraft(draft);

    const missing = missingDraftFields(draftFieldsSchema.parse(draft.fields));
    if (missing.length) {
      throw new ApiError(409, "draft_incomplete", `Still needed before confirming: ${missing.join(", ")}.`);
    }
    await client.query(
      `UPDATE report_drafts
       SET confirmed_revision = revision, confirmation_channel = $1, confirmed_at = now(), updated_at = now()
       WHERE id = $2`,
      [input.channel, draft.id],
    );
    await recordAudit(client, ctx, {
      operation: "report_draft.confirm",
      entity_type: "report_draft",
      entity_id: draft.id,
      related: { revision: draft.revision, channel: input.channel },
      outcome: "confirmed",
    });
    return projectDraft(await loadOwnedDraft(client, owner.id, draft.id));
  });
}
