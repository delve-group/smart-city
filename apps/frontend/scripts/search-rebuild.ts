import { getPool } from "../src/server/db";
import { ConfigurationError, getConfig } from "../src/server/config";
import { SearchError } from "../src/server/search/errors";
import { enqueueSearchRebuild } from "../src/server/search/rebuild";
import { loadEnvironment } from "./db-common";

async function main() {
  loadEnvironment();
  getConfig();
  try {
    const result = await enqueueSearchRebuild();
    console.info("Search reconciliation queued", result);
    console.info("The worker will re-read current sources and remove deleted records. Queueing is not completion; inspect worker:status and search freshness.");
  } finally {
    await getPool().end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof ConfigurationError || error instanceof SearchError
    ? error.message : "Search rebuild failed. Check database and provider availability; rerunning safely creates a fresh recovery sweep.");
  process.exitCode = 1;
});
