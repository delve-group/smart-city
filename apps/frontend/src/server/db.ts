import "server-only";
import { Pool } from "pg";
import { getConfig } from "./config";

const databaseGlobal = globalThis as typeof globalThis & { smartCityPool?: Pool };

export function getPool(): Pool {
  if (!databaseGlobal.smartCityPool) {
    databaseGlobal.smartCityPool = new Pool({
      connectionString: getConfig().databaseUrl,
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 10_000,
    });
    databaseGlobal.smartCityPool.on("error", () => {
      // Driver errors can contain connection details; keep them out of logs.
      console.error("An idle database connection failed. Check database availability.");
    });
  }
  return databaseGlobal.smartCityPool;
}
