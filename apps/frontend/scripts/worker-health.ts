import { getWorkerConfig } from "../src/server/jobs/config";
import { getWorkerDiagnostics } from "../src/server/jobs/status";
import { createScriptPool, loadEnvironment, reportSetupFailure } from "./db-common";

async function main() {
  loadEnvironment();
  const config = getWorkerConfig();
  const pool = createScriptPool();
  try {
    const diagnostics = await getWorkerDiagnostics(pool, config.heartbeatMs * 3);
    if (process.argv.includes("--details")) console.info(JSON.stringify(diagnostics));
    if (!diagnostics.healthy) {
      console.error("Worker heartbeat is missing or stale. Inspect worker logs and database availability.");
      process.exitCode = 1;
    }
  } finally { await pool.end(); }
}
void main().catch((error: unknown) => reportSetupFailure("Worker health check", error));
