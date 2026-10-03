import { getDemoPasswords } from "../src/server/config";
import { hashPassword } from "../src/server/auth/password";
import { createScriptPool, loadEnvironment, reportSetupFailure, SetupError } from "./db-common";
import { seedDemoFixtures } from "./demo-fixtures";

async function seed(): Promise<void> {
  loadEnvironment();
  const passwords = getDemoPasswords();
  const accounts = [
    { username: "official", role: "official", institutionId: null, password: passwords.DEMO_OFFICIAL_PASSWORD },
    { username: "electricity", role: "institution", institutionId: "demo-electricity", password: passwords.DEMO_ELECTRICITY_PASSWORD },
    { username: "water", role: "institution", institutionId: "demo-water", password: passwords.DEMO_WATER_PASSWORD },
  ];
  const pool = createScriptPool();
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(736142001)");
      await client.query(`
        INSERT INTO institutions (id, name, is_demo)
        VALUES ('demo-electricity', 'Demo Electricity Service', true),
               ('demo-water', 'Demo Water Service', true)
        ON CONFLICT (id) DO NOTHING
      `);
      let created = 0;
      for (const account of accounts) {
        const existing = await client.query<{ role: string; identity_kind: string; institution_id: string | null }>(
          "SELECT role, identity_kind, institution_id FROM actors WHERE username = $1",
          [account.username],
        );
        if (existing.rows[0]) {
          const actor = existing.rows[0];
          if (actor.role !== account.role || actor.identity_kind !== "demo_staff" || actor.institution_id !== account.institutionId) {
            throw new SetupError(`Existing account ${account.username} does not match the demo seed identity. No accounts were changed.`);
          }
          continue;
        }

        await client.query(
          `INSERT INTO actors (role, identity_kind, username, password_hash, institution_id)
           VALUES ($1, 'demo_staff', $2, $3, $4)`,
          [account.role, account.username, await hashPassword(account.password), account.institutionId],
        );
        created += 1;
      }
      // Demo configuration: which fictional institution answers for which category and issue.
      await client.query(`
        INSERT INTO responsibility_rules (id, category_id, issue_type, institution_id)
        VALUES ('demo-rule-power', 'power', NULL, 'demo-electricity'),
               ('demo-rule-water-outage', 'water', 'water_outage', 'demo-water'),
               ('demo-rule-water-pipe', 'water', 'burst_pipe', 'demo-water')
        ON CONFLICT (id) DO NOTHING
      `);
      const fixtures = await seedDemoFixtures(client);
      await client.query("COMMIT");
      console.info(`Demo seed complete: ${created} staff account(s) created. Existing passwords were preserved.`);
      console.info(fixtures ? "Fictional demo incidents and reports were added." : "Demo incidents were already present.");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

void seed().catch((error: unknown) => reportSetupFailure("Demo seed", error));
