import "server-only";
import { Pool, type PoolClient } from "pg";
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

/** Runs one unit of work in a transaction; any thrown error rolls back every write in it. */
export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
