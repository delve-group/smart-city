import "server-only";

import type { ActorContext } from "@/server/actor-context";
import { getReportSearchSource, hydrateReportHit, listReportSourceRefs } from "./reports";
import type { SearchHit, SearchSource, SourceRecordType, SourceRef } from "./types";

export type { Audience, SearchHit, SearchSource, SourceRecordType, SourceRef } from "./types";

/*
 * Current authoritative text per audience, for the search workstream. Incident and
 * service-ticket sources join with their domain slices; until then they read as absent.
 */

/** Null: the record is gone and must leave the index. */
export async function getSearchSource(ref: SourceRef): Promise<SearchSource | null> {
  if (ref.record_type === "report") return getReportSearchSource(ref.record_id);
  return null;
}

/** Pages every current source of one type, for rebuilds and reconciliation. */
export async function listSearchSourceRefs(
  type: SourceRecordType,
  cursor: string | null,
): Promise<{ items: (SourceRef & { version: number })[]; next_cursor: string | null }> {
  if (type === "report") return listReportSourceRefs(cursor);
  return { items: [], next_cursor: null };
}

/** Query-time recheck: the caller's current permitted projection, or null if it may not see the record. */
export async function hydrateSearchHit(ctx: ActorContext, ref: SourceRef): Promise<SearchHit | null> {
  if (ref.record_type === "report") return hydrateReportHit(ctx, ref.record_id);
  return null;
}
