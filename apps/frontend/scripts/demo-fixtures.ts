import type { PoolClient } from "pg";
import { buildingKey, serviceAreaId, streetKey } from "../src/server/incidents/geo";
import { incidentTitle } from "../src/server/incidents/public-templates";

/*
 * DEMO FIXTURES. Fictional residents, reports and incidents at real Kraków streets, with explicit
 * report-to-incident links. Each supporter is a seeded guest identity; nothing is derived from
 * the legacy map's confirmation counters. Times are relative to the moment of seeding.
 */

interface FixtureReport {
  owner: number;
  minutesAgo: number;
  category_id: string;
  issue_type: string;
  summary: string;
  original: string;
  lat: number;
  lng: number;
  street: string;
  number: string;
  unit?: string;
  scope: "unit" | "building" | "street";
  channel: "form" | "voice";
  /** Defaults by category: outages are urgent, everything else affects daily life. */
  severity?: "low" | "medium" | "high";
}

const DEFAULT_SEVERITY: Record<string, "low" | "medium" | "high"> = { power: "high", water: "high" };

const DIETLA: Omit<FixtureReport, "owner" | "minutesAgo" | "summary" | "original" | "lat" | "lng" | "number" | "channel"> = {
  category_id: "power", issue_type: "power_outage", street: "Józefa Dietla", scope: "street",
};

async function insertReport(client: PoolClient, owners: string[], report: FixtureReport, triage: {
  state: "pending" | "needs_review"; reason?: string; note?: string; candidates?: object[];
}): Promise<string> {
  const observedAt = new Date(Date.now() - (report.minutesAgo + 4) * 60_000);
  const label = `ul. ${report.street} ${report.number}`;
  const severity = report.severity ?? DEFAULT_SEVERITY[report.category_id] ?? "medium";
  const fields = {
    category_id: report.category_id, issue_type: report.issue_type, title: report.summary, description: report.original,
    severity, observed_at: observedAt.toISOString(), observed_time_state: "known", scope: report.scope, urgent: false,
    location: {
      candidate_id: null, lat: report.lat, lng: report.lng, label, street: report.street, building_number: report.number,
      district: "Stare Miasto", precision: "building", source: "map_pin", unit: report.unit ?? null,
    },
  };
  const draft = await client.query<{ id: string; submission_key: string }>(
    `INSERT INTO report_drafts (owner_id, fields, confirmed_revision, confirmation_channel, confirmed_at)
     VALUES ($1, $2, 1, $3, now()) RETURNING id, submission_key`,
    [owners[report.owner], JSON.stringify(fields), report.channel === "voice" ? "voice" : "button"],
  );
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO reports
       (reference, owner_id, draft_id, submission_key, channel, category_id, issue_type, severity, summary, original_observation,
        lat, lng, location_label, street, building_number, unit, district, location_precision, location_source,
        observed_at, observed_time_state, scope, triage_state, review_reason, review_note, review_since, review_candidates,
        submitted_at)
     VALUES ('R-26-' || lpad(nextval('report_reference_seq')::text, 6, '0'), $1, $2, $3, $4, $5, $6, $22, $7, $8, $9, $10, $11,
             $12, $13, $14, 'Stare Miasto', 'building', 'map_pin', $15, 'known', $16, $17, $18, $19,
             CASE WHEN $18::text IS NULL THEN NULL ELSE now() END, $20, now() - $21 * interval '1 minute')
     RETURNING id`,
    [
      owners[report.owner], draft.rows[0].id, draft.rows[0].submission_key, report.channel, report.category_id,
      report.issue_type, report.summary, report.original, report.lat, report.lng, label, report.street, report.number,
      report.unit ?? null, observedAt, report.scope, triage.state, triage.reason ?? null, triage.note ?? null,
      JSON.stringify(triage.candidates ?? []), report.minutesAgo, severity,
    ],
  );
  await client.query("UPDATE report_drafts SET report_id = $1, submitted_revision = 1 WHERE id = $2", [inserted.rows[0].id, draft.rows[0].id]);
  return inserted.rows[0].id;
}

async function insertIncident(client: PoolClient, owners: string[], reports: FixtureReport[], institutionId: string, ruleId: string, observation: {
  label: string; state: "current" | "missing"; note: string | null;
}): Promise<string> {
  const first = reports[0];
  const scope = first.scope === "building" ? "building" : "street";
  const publicLabel = scope === "building" ? `ul. ${first.street} ${first.number}` : `ul. ${first.street}`;
  const anchorObservedAt = new Date(Date.now() - (first.minutesAgo + 4) * 60_000);
  const supporters = new Set(reports.map((report) => report.owner)).size;
  const incident = await client.query<{ id: string }>(
    `INSERT INTO incidents
       (reference, category_id, issue_type, title, anchor_lat, anchor_lng, anchor_observed_at, service_area_id, street_key,
        building_key, scope, public_label, public_precision, district, assessment, response_status, support_count,
        responsible_institution_id, responsibility_rule_id, created_at, updated_at)
     VALUES ('INC-26-' || lpad(nextval('incident_reference_seq')::text, 6, '0'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
             $10, 'Stare Miasto', $12, 'triaged', $13, $14, $15, now() - $16 * interval '1 minute', now())
     RETURNING id`,
    [
      first.category_id, first.issue_type, incidentTitle(first.issue_type, publicLabel, scope), first.lat, first.lng,
      anchorObservedAt, serviceAreaId(first), streetKey(first.street), buildingKey(first.street, first.number), scope,
      publicLabel, supporters >= 2 ? "corroborated" : "suspected", supporters, institutionId, ruleId, first.minutesAgo,
    ],
  );
  const incidentId = incident.rows[0].id;
  await client.query("INSERT INTO incident_events (incident_id, kind, occurred_at) VALUES ($1, 'reported', now() - $2 * interval '1 minute')", [incidentId, first.minutesAgo]);
  if (supporters >= 2) {
    await client.query("INSERT INTO incident_events (incident_id, kind, occurred_at) VALUES ($1, 'corroborated', now() - $2 * interval '1 minute')", [incidentId, reports[1].minutesAgo]);
  }
  for (const report of reports) {
    const reportId = await insertReport(client, owners, report, { state: "pending" });
    await client.query("UPDATE reports SET triage_state = 'linked', incident_id = $1, version = 2 WHERE id = $2", [incidentId, reportId]);
    await client.query(
      "INSERT INTO incident_report_links (report_id, incident_id, linked_by, reason) VALUES ($1, $2, 'seed', 'Explicit initial data link')",
      [reportId, incidentId],
    );
    await client.query(
      `INSERT INTO incident_evidence (incident_id, report_id, kind, label, source, observed_at)
       SELECT $1, id, 'report', reference || ' · ' || initcap(channel) || ' report', 'Resident report (unverified identity)', observed_at
       FROM reports WHERE id = $2`,
      [incidentId, reportId],
    );
  }
  await client.query(
    `INSERT INTO incident_evidence (incident_id, kind, label, source, observed_at, state, note)
     VALUES ($1, 'observation', $2, 'Utility feed', $3, $4, $5)`,
    [incidentId, observation.label, observation.state === "missing" ? null : new Date(anchorObservedAt.getTime() + 120_000), observation.state, observation.note],
  );
  return incidentId;
}

/** Idempotent: runs once per database, marked by an audit event. */
export async function seedDemoFixtures(client: PoolClient): Promise<boolean> {
  const marker = await client.query("SELECT 1 FROM audit_events WHERE operation = 'demo.fixtures' LIMIT 1");
  if (marker.rowCount) return false;

  const owners: string[] = [];
  for (let index = 0; index < 4; index += 1) {
    const actor = await client.query<{ id: string }>("INSERT INTO actors (role, identity_kind) VALUES ('resident', 'guest') RETURNING id");
    owners.push(actor.rows[0].id);
  }

  const outage = await insertIncident(client, owners, [
    { ...DIETLA, owner: 0, minutesAgo: 40, channel: "voice", lat: 50.05806, lng: 19.94532, number: "44",
      summary: "No power on the whole street", original: "Nie ma prądu w całym budynku od około drugiej. Latarnie na ulicy też nie świecą." },
    { ...DIETLA, owner: 1, minutesAgo: 35, channel: "form", lat: 50.0579, lng: 19.946, number: "46",
      summary: "Power is out along Dietla", original: "Brak prądu u nas i u sąsiadów naprzeciwko." },
    { ...DIETLA, owner: 2, minutesAgo: 30, channel: "form", lat: 50.0576, lng: 19.947, number: "52",
      summary: "Outage on Dietla, shops are dark", original: "Sklepy na parterze są ciemne, cała ulica bez prądu." },
  ], "demo-electricity", "demo-rule-power", { label: "Supply interrupted on the local feeder", state: "current", note: null });

  await insertIncident(client, owners, [
    { owner: 1, minutesAgo: 75, channel: "form", category_id: "water", issue_type: "burst_pipe", scope: "street",
      lat: 50.0655, lng: 19.93, street: "Karmelicka", number: "20",
      summary: "Water running down the street", original: "Woda leje się spod chodnika przy Karmelickiej 20." },
  ], "demo-water", "demo-rule-water-pipe", { label: "No supply reading available", state: "missing", note: "No feed is configured for this area and category." });

  await insertReport(client, owners, {
    ...DIETLA, owner: 3, minutesAgo: 20, channel: "voice", lat: 50.0577, lng: 19.9466, number: "50", unit: "flat 4", scope: "unit",
    summary: "No power in one flat only", original: "Tylko u mnie w mieszkaniu nie ma prądu, na klatce jest światło.",
  }, {
    state: "needs_review", reason: "private_scope", note: "One flat or unit only. Kept private until the scope is reviewed.",
    candidates: [{ incident_id: outage, distance_m: 97, minutes_apart: 20 }],
  });
  await insertReport(client, owners, {
    owner: 0, minutesAgo: 15, channel: "form", category_id: "water", issue_type: "blocked_drain", scope: "street",
    lat: 50.057, lng: 19.9446, street: "Starowiślna", number: "30",
    summary: "Blocked drain, water pooling at the crossing", original: "Studzienka zatkana, woda stoi na przejściu dla pieszych.",
  }, { state: "needs_review", reason: "needs_link", note: "Automatic grouping covers power outages only. Triage this report manually." });

  await client.query(
    `INSERT INTO audit_events (actor_kind, actor_role, operation, entity_type, entity_id, outcome, correlation_id)
     VALUES ('system', 'seed', 'demo.fixtures', 'incident', $1, 'seeded', 'seed')`,
    [outage],
  );
  return true;
}
