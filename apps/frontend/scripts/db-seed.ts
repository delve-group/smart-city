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
        VALUES ('demo-electricity', 'Pogotowie energetyczne', true),
               ('demo-water', 'Służba wodociągowa', true),
               ('demo-roads', 'Zarząd dróg', true),
               ('demo-transit', 'Przewoźnik komunikacji miejskiej', true),
               ('demo-waste', 'Służba oczyszczania miasta', true),
               ('demo-greenery', 'Służba zieleni miejskiej', true),
               ('demo-air', 'Służba ochrony środowiska', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
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
               ('demo-rule-water-pipe', 'water', 'burst_pipe', 'demo-water'),
               ('demo-rule-roads', 'roads', NULL, 'demo-roads'),
               ('demo-rule-accessibility', 'accessibility', NULL, 'demo-roads'),
               ('demo-rule-transit', 'transit', NULL, 'demo-transit'),
               ('demo-rule-waste', 'waste', NULL, 'demo-waste'),
               ('demo-rule-greenery', 'greenery', NULL, 'demo-greenery')
        ON CONFLICT (id) DO NOTHING
      `);
      const fixtures = await seedDemoFixtures(client);
      // Incidents with one responsible demo institution and no proposal yet get the same
      // rule-based pending proposal the triage flow prepares. Nothing is approved or sent.
      await client.query(`
        WITH ready AS (
          SELECT i.id, i.version, i.title, i.public_label, i.district, i.assessment, i.support_count,
                 i.responsible_institution_id, gen_random_uuid() AS proposal_id
          FROM incidents i
          WHERE i.responsible_institution_id IS NOT NULL AND i.response_status IN ('new', 'triaged') AND i.review_reason IS NULL
            AND NOT EXISTS (SELECT 1 FROM action_proposals p WHERE p.incident_id = i.id)
            AND NOT EXISTS (SELECT 1 FROM service_tickets t WHERE t.incident_id = i.id)
        ), inserted AS (
          INSERT INTO action_proposals
            (id, incident_id, version, incident_version, institution_id, action, payload, evidence_ids, explanation, created_by, execution_key)
          SELECT r.proposal_id, r.id, 1, r.version, r.responsible_institution_id, 'create_service_ticket',
                 jsonb_build_array(
                   jsonb_build_object('key', 'Issue', 'value', r.title),
                   jsonb_build_object('key', 'Area', 'value', concat_ws(', ', r.public_label, r.district)),
                   jsonb_build_object('key', 'Residents reporting', 'value', r.support_count || ' (niezweryfikowane tożsamości)'),
                   jsonb_build_object('key', 'City assessment', 'value', r.assessment)),
                 ARRAY(SELECT e.id FROM incident_evidence e WHERE e.incident_id = r.id AND e.removed_at IS NULL AND e.state <> 'missing'),
                 'Przygotowano na podstawie skonfigurowanej reguły odpowiedzialności, bez modelu językowego.',
                 'Rule-based proposer', 'execute:proposal:' || r.proposal_id
          FROM ready r
          RETURNING incident_id
        )
        UPDATE incidents SET review_reason = 'proposal_ready', review_note = 'Propozycja zlecenia czeka na Twoją decyzję.', review_since = now()
        WHERE id IN (SELECT incident_id FROM inserted)
      `);
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
