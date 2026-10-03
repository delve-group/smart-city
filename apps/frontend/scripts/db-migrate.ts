import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createScriptPool, loadEnvironment, reportSetupFailure, SetupError } from "./db-common";

async function migrate(): Promise<void> {
  loadEnvironment();
  const pool = createScriptPool();
  try {
    const client = await pool.connect();
    try {
      // Serialize setup processes even when two developers start the same database.
      await client.query("SELECT pg_advisory_lock(736142000)");
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          name text PRIMARY KEY,
          checksum text NOT NULL,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      const directory = resolve(process.cwd(), "db/migrations");
      const filenames = (await readdir(directory))
        .filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name))
        .sort();
      if (!filenames.length) throw new SetupError("No SQL migrations were found in db/migrations.");

      for (const filename of filenames) {
        const sql = await readFile(resolve(directory, filename), "utf8");
        const checksum = createHash("sha256").update(sql).digest("hex");
        const existing = await client.query<{ checksum: string }>(
          "SELECT checksum FROM schema_migrations WHERE name = $1",
          [filename],
        );
        if (existing.rows[0]) {
          if (existing.rows[0].checksum !== checksum) {
            throw new SetupError(`Applied migration ${filename} was modified. Restore it and add a new migration instead.`);
          }
          continue;
        }

        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [filename, checksum]);
          await client.query("COMMIT");
          console.info(`Applied ${filename}.`);
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }
      console.info("Database migrations are up to date.");
    } finally {
      // Releasing the connection also releases the session advisory lock.
      client.release(true);
    }
  } finally {
    await pool.end();
  }
}

void migrate().catch((error: unknown) => reportSetupFailure("Database migration", error));
