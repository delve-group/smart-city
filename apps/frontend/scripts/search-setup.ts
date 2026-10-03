import { loadEnvConfig } from "@next/env";
import { setTimeout as delay } from "node:timers/promises";
import { SearchIndex } from "../src/server/search/qdrant";
import { ConfigurationError } from "../src/server/config";
import { SearchError } from "../src/server/search/errors";

loadEnvConfig(process.cwd());

// Exit the owning process if a cold download/native runtime never settles.
const deadline = setTimeout(() => {
  console.error("Search setup timed out. Core services may continue with search degraded; retry setup after checking provider availability.");
  process.exit(1);
}, 120_000);

async function main() {
  const index = new SearchIndex();
  for (let attempt = 1; ; attempt += 1) {
    try {
      await index.setup();
      break;
    } catch (error) {
      if (!(error instanceof SearchError) || error.code !== "search_unavailable"
        || !error.retryable || attempt >= 5) throw error;
      console.log(`Qdrant is not ready. Retrying setup (${attempt + 1}/5).`);
      await delay(1_000);
    }
  }
  console.log("Qdrant collection and payload indexes are ready. No source records were indexed.");
  await index.warmup();
  console.log("The pinned multilingual embedding model is ready.");
}

main().then(() => clearTimeout(deadline)).catch((error: unknown) => {
  console.error(error instanceof SearchError || error instanceof ConfigurationError
    ? error.message : "Search setup failed. Check provider availability and model-cache permissions.");
  // A timed-out native operation can still own handles; do not let it block startup.
  process.exit(error instanceof ConfigurationError || (error instanceof SearchError && !error.retryable) ? 2 : 1);
});
