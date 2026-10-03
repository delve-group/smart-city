import "server-only";

import { randomUUID } from "node:crypto";
import { withTransaction } from "@/server/db";
import { enqueueWork } from "@/server/jobs";
import { listSearchSourceRefs } from "@/server/search-sources";
import { SearchError } from "./errors";
import { getSearchIndex } from "./qdrant";
import type { SourceRef } from "./types";

const SOURCE_TYPES = ["report", "incident", "service_ticket"] as const;
const MAX_SOURCES = 10_000;

/**
 * Queue a bounded sweep, including indexed sources that may have been deleted.
 * Only the single worker writes Qdrant. Concurrent domain writes enqueue their own
 * work, including inserts behind this UUID keyset cursor; this is not a snapshot.
 */
export async function enqueueSearchRebuild() {
  const runId = randomUUID();
  const refs = new Map<string, SourceRef & { version: number }>();
  const add = (item: SourceRef & { version: number }) => {
    const key = `${item.record_type}:${item.record_id}`;
    const previous = refs.get(key);
    if (!previous || item.version > previous.version) refs.set(key, item);
    if (refs.size > MAX_SOURCES) {
      throw new SearchError("invalid_search_input", "Rebuild exceeds the 10,000-source maintenance limit. No sweep work was enqueued.", false);
    }
  };
  for (const type of SOURCE_TYPES) {
    let cursor: string | null = null;
    let sourcePages = 0;
    do {
      const page = await listSearchSourceRefs(type, cursor);
      page.items.forEach(add);
      if (page.next_cursor !== null && page.next_cursor === cursor) throw new Error("Source pagination did not advance.");
      cursor = page.next_cursor;
      if (++sourcePages > 100) throw new Error("Source pagination exceeded the maintenance limit.");
    } while (cursor !== null);
  }

  let cursor: string | number | null = null;
  let indexPages = 0;
  do {
    const page = await getSearchIndex().listIndexedSources(cursor);
    page.items.forEach(add);
    if (page.next_cursor !== null && page.next_cursor === cursor) throw new Error("Index pagination did not advance.");
    cursor = page.next_cursor;
    if (++indexPages > 200) throw new Error("Index pagination exceeded the maintenance limit.");
  } while (cursor !== null);

  // All provider calls finish before short enqueue transactions start.
  const items = [...refs.values()];
  let queued = 0;
  for (let offset = 0; offset < items.length; offset += 100) {
    const batch = items.slice(offset, offset + 100);
    await withTransaction(async (client) => {
      for (const ref of batch) {
        await enqueueWork(client, {
          kind: "index",
          source: { type: ref.record_type, id: ref.record_id, version: ref.version },
          idempotency_key: `search-rebuild:${runId}:${ref.record_type}:${ref.record_id}`,
          correlation_id: runId,
        });
      }
    });
    queued += batch.length;
  }
  return { run_id: runId, queued, source_limit: MAX_SOURCES };
}
