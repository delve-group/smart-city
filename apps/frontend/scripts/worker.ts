import { getPool } from "../src/server/db";
import { getConfig } from "../src/server/config";
import { getWorkerConfig } from "../src/server/jobs/config";
import { registerApplicationWorkHandlers } from "../src/server/jobs/handlers";
import { getWorkHandlers } from "../src/server/jobs/registry";
import { runWorker, WorkerRuntimeError } from "../src/server/jobs/worker";
import { loadEnvironment, reportSetupFailure } from "./db-common";

const stop = new AbortController();
let shutdownTimer: ReturnType<typeof setTimeout> | undefined;
function requestStop() {
  if (stop.signal.aborted) return;
  console.info("Worker stopping: no new claims; allowing the current handler to finish.");
  stop.abort();
  shutdownTimer = setTimeout(() => {
    console.error("Worker shutdown deadline reached; unfinished leased work remains recoverable.");
    process.exit(1);
  }, 30_000);
  shutdownTimer.unref();
}
process.once("SIGTERM", requestStop);
process.once("SIGINT", requestStop);

async function main() {
  loadEnvironment();
  getConfig();
  const config = getWorkerConfig();
  registerApplicationWorkHandlers();
  const pool = getPool();
  await runWorker(pool, { ...config, signal: stop.signal, handlers: getWorkHandlers() });
  await pool.end();
  if (shutdownTimer) clearTimeout(shutdownTimer);
  console.info("Worker stopped.");
}

void main().catch((error: unknown) => {
  if (error instanceof WorkerRuntimeError) console.error(error.message, { code: error.code });
  else reportSetupFailure("Worker startup or processing", error);
  // A lost session may leave an in-flight handler promise. Terminate the process
  // before a replacement can reclaim it; do not continue using a fresh session.
  process.exit(1);
});
