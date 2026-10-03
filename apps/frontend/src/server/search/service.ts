import "server-only";

import type { ActorContext } from "@/server/actor-context";
import { ApiError } from "@/server/http/api";
import { hydrateSearchHit } from "@/server/search-sources";
import { getPool } from "@/server/db";
import { SearchError } from "./errors";
import { getSearchIndex } from "./qdrant";
import { recordsSearchSchema, type RecordsSearchInput } from "./request";
import { sourceRefSchema, validateSearchInput, type Audience, type SearchCandidate, type SearchFilters, type SourceRef } from "./types";

export interface RecordsSearchPage {
  status: "ready" | "index_stale";
  items: (SourceRef & {
    source_version: number; title: string; excerpt: string; category_id: string | null;
    score: number; indexed_at: string;
  })[];
  next_cursor: null;
}

/** Only authenticated adapters may build ActorContext. Input never selects an audience. */
function audienceFor(ctx: ActorContext): Audience {
  if (ctx.kind === "anonymous" || (ctx.kind === "session" && ctx.actor.role === "resident")) return { kind: "public" };
  if (ctx.kind === "system") {
    if (ctx.principal === "decision_maker") return { kind: "official" };
    throw new ApiError(403, "forbidden", "This service principal cannot search records.");
  }
  if (ctx.actor.role === "official") return { kind: "official" };
  if (ctx.actor.role === "institution" && ctx.actor.institution_id) {
    return { kind: "institution", institution_id: ctx.actor.institution_id };
  }
  throw new ApiError(403, "forbidden", "This account cannot search records.");
}

function permittedTypes(scope: Audience, requested: SourceRef["record_type"][]): SourceRef["record_type"][] {
  const allowed: SourceRef["record_type"][] = scope.kind === "public" ? ["incident"]
    : scope.kind === "institution" ? ["service_ticket"] : ["report", "incident", "service_ticket"];
  return requested.length ? allowed.filter((type) => requested.includes(type)) : allowed;
}

/** Exact source lookup remains available from PostgreSQL during a search-provider outage. */
export async function getSearchRecord(ctx: ActorContext, input: SourceRef) {
  const ref = validateSearchInput(sourceRefSchema, input);
  if (!permittedTypes(audienceFor(ctx), []).includes(ref.record_type)) {
    throw new ApiError(404, "not_found", "The record was not found.");
  }
  const current = await hydrateSearchHit(ctx, ref);
  if (!current) throw new ApiError(404, "not_found", "The record was not found.");
  return current;
}

/** Bounded diagnostics only. Source hydration still decides whether a source is visible. */
async function hasVisiblePendingWork(ctx: ActorContext, scope: Audience, types: SourceRef["record_type"][]): Promise<boolean> {
  const rows = await getPool().query<{ record_type: SourceRef["record_type"]; record_id: string }>(
    `SELECT source_type AS record_type, source_id AS record_id FROM (
       SELECT DISTINCT ON (w.source_type, w.source_id) w.source_type, w.source_id, w.state
       FROM work_items w
       WHERE w.kind = 'index' AND w.source_type = ANY($1::text[])
         AND ((w.source_type = 'report' AND EXISTS (SELECT 1 FROM reports r WHERE r.id::text = w.source_id))
           OR (w.source_type = 'incident' AND EXISTS (SELECT 1 FROM incidents i WHERE i.id::text = w.source_id))
           OR (w.source_type = 'service_ticket' AND EXISTS (SELECT 1 FROM service_tickets t WHERE t.id::text = w.source_id)))
         AND ($2::text IS NULL OR EXISTS (
           SELECT 1 FROM service_tickets t WHERE t.id::text = w.source_id AND t.institution_id = $2::text))
       ORDER BY w.source_type, w.source_id, w.source_version DESC, w.created_at DESC, w.id DESC
     ) latest WHERE state <> 'done'
     ORDER BY record_type, record_id LIMIT 32`,
    [types, scope.kind === "institution" ? scope.institution_id : null],
  );
  for (const ref of rows.rows) {
    if (await hydrateSearchHit(ctx, ref)) return true;
  }
  return false;
}

/** Shared by HTTP and future scoped tools; returns only current source-owned text. */
export async function searchRecords(ctx: ActorContext, input: RecordsSearchInput): Promise<RecordsSearchPage> {
  const options = validateSearchInput(recordsSearchSchema, input);
  const scope = audienceFor(ctx);
  const types = permittedTypes(scope, options.record_type);
  const page: RecordsSearchPage = { status: "ready", items: [], next_cursor: null };
  const related = options.related_type && options.related_id
    ? await getSearchRecord(ctx, { record_type: options.related_type, record_id: options.related_id }) : null;
  if (!types.length) return page;
  const filters: SearchFilters = {
    recordTypes: types,
    ...(options.category_id.length ? { categoryIds: options.category_id } : {}),
    ...(options.issue_type.length ? { issueTypes: options.issue_type } : {}),
  };
  let candidates: SearchCandidate[];
  try {
    const index = getSearchIndex();
    if (related) {
      candidates = (await index.related(scope, { ...related.ref, version: related.version }, options.limit, filters)).candidates;
      const stillCurrent = await getSearchRecord(ctx, related.ref);
      if (stillCurrent.version !== related.version) return { ...page, status: "index_stale" };
    } else {
      candidates = (await index.search(scope, {
        query: options.q!, mode: options.mode, limit: options.limit, filters,
      })).candidates;
    }
  } catch (error) {
    if (!(error instanceof SearchError) || error.code !== "index_stale") throw error;
    return { ...page, status: "index_stale" };
  }

  for (const candidate of candidates) {
    const current = await hydrateSearchHit(ctx, candidate);
    // Do not expose even a stale-count signal for a deleted or unauthorized source.
    if (!current) continue;
    if (current.version !== candidate.source_version) {
      page.status = "index_stale";
      continue;
    }
    page.items.push({
      record_type: current.ref.record_type, record_id: current.ref.record_id,
      source_version: current.version, title: current.title.slice(0, 200),
      excerpt: current.excerpt.slice(0, 240), category_id: current.category_id,
      score: candidate.score, indexed_at: candidate.indexed_at,
    });
  }
  if (page.status === "ready" && await hasVisiblePendingWork(ctx, scope, types)) page.status = "index_stale";
  return page;
}
