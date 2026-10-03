import "server-only";

import type { ActorContext } from "@/server/actor-context";
import { getIncidentSearchSource, hydrateIncidentHit, listIncidentSourceRefs } from "./incidents";
import { getReportSearchSource, hydrateReportHit, listReportSourceRefs } from "./reports";
import { getTicketSearchSource, hydrateTicketHit, listTicketSourceRefs } from "./tickets";
import type { SearchHit, SearchSource, SourceRecordType, SourceRef } from "./types";

export type { Audience, SearchHit, SearchSource, SourceRecordType, SourceRef } from "./types";

/*
 * Current authoritative text per audience, for the search workstream: reports (official only),
 * incidents (public and official) and service tickets (official and the assigned institution).
 */

/** Null: the record is gone and must leave the index. */
export async function getSearchSource(ref: SourceRef): Promise<SearchSource | null> {
  if (ref.record_type === "report") return getReportSearchSource(ref.record_id);
  if (ref.record_type === "incident") return getIncidentSearchSource(ref.record_id);
  return getTicketSearchSource(ref.record_id);
}

/** Pages every current source of one type, for rebuilds and reconciliation. */
export async function listSearchSourceRefs(
  type: SourceRecordType,
  cursor: string | null,
): Promise<{ items: (SourceRef & { version: number })[]; next_cursor: string | null }> {
  if (type === "report") return listReportSourceRefs(cursor);
  if (type === "incident") return listIncidentSourceRefs(cursor);
  return listTicketSourceRefs(cursor);
}

/** Query-time recheck: the caller's current permitted projection, or null if it may not see the record. */
export async function hydrateSearchHit(ctx: ActorContext, ref: SourceRef): Promise<SearchHit | null> {
  if (ref.record_type === "report") return hydrateReportHit(ctx, ref.record_id);
  if (ref.record_type === "incident") return hydrateIncidentHit(ctx, ref.record_id);
  return hydrateTicketHit(ctx, ref.record_id);
}
