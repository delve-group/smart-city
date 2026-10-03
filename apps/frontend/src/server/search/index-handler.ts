import "server-only";

import { ConfigurationError } from "@/server/config";
import { getPool } from "@/server/db";
import type { WorkHandler } from "@/server/jobs";
import { getSearchSource } from "@/server/search-sources";
import { SearchError } from "./errors";
import { getSearchIndex } from "./qdrant";

/**
 * The single durable worker is the only application writer to Qdrant. Rebuilds
 * enqueue here too. Never index the event's old snapshot or call this concurrently.
 */
export const handleIndexWork: WorkHandler = async (work) => {
  if (work.kind !== "index" || work.source.type === "action_proposal") {
    return { status: "parked", reason: "search_source_unsupported" };
  }
  const ref = { record_type: work.source.type, record_id: work.source.id };
  try {
    const source = await getSearchSource(ref);
    const index = getSearchIndex();
    if (source) await index.replaceRecord(source);
    else await index.deleteRecord(ref);

    // Domain writes can commit during inference. Their transactional work provides
    // catch-up; do not clear failure/status records unless this version is current.
    const current = await getSearchSource(ref);
    if ((current?.version ?? null) !== (source?.version ?? null)) {
      return { status: "parked", reason: "source_changed_during_indexing" };
    }
    await getPool().query(
      `UPDATE work_items SET state = 'done', detail = 'reconciled_by_current_index',
         finished_at = clock_timestamp(), updated_at = clock_timestamp()
       WHERE kind = 'index' AND source_type = $1 AND source_id = $2
         AND source_version <= $3 AND state IN ('queued', 'parked', 'failed')`,
      [ref.record_type, ref.record_id, source?.version ?? work.source.version],
    );
    return { status: "done", detail: source ? `indexed_source_version:${source.version}` : "deleted_source_removed" };
  } catch (error) {
    if (error instanceof SearchError) {
      return { status: error.retryable ? "retry" : "failed", reason: error.code };
    }
    if (error instanceof ConfigurationError) return { status: "failed", reason: "search_configuration_invalid" };
    // Database/provider errors are never copied into durable job details.
    return { status: "retry", reason: "search_dependency_unavailable" };
  }
};
