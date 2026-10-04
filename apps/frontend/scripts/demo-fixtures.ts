import type { PoolClient } from "pg";
import { buildingKey, serviceAreaId, streetKey } from "../src/server/incidents/geo";

/*
 * DEMO FIXTURES. Fictional residents, reports and incidents at real Kraków streets, written in Polish
 * like real residents' reports, with explicit report-to-incident links. Each supporter is a seeded
 * guest identity; nothing is derived from the legacy map's confirmation counters. Times are relative
 * to the moment of seeding. Set 1 is the original Stare Miasto outage; set 2 adds every other category
 * and incidents already sent to institutions.
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
  district?: string;
  /** Defaults by category: outages are urgent, everything else affects daily life. */
  severity?: "low" | "medium" | "high";
}

/** Work the institution has already done on the incident's ticket, newest step last. */
interface FixtureWork {
  sentMinutesAgo: number;
  steps: { status: "acknowledged" | "in_progress" | "resolved"; minutesAgo: number; note?: string }[];
}

interface FixtureIncident {
  title: string;
  institutionId: string | null;
  ruleId: string | null;
  reports: FixtureReport[];
  observation?: { label: string; state: "current" | "missing"; note: string | null };
  /** No institution yet: the official chooses. */
  review?: { reason: "needs_responsibility" | "urgent"; note: string };
  urgent?: boolean;
  work?: FixtureWork;
}

const DEFAULT_SEVERITY: Record<string, "low" | "medium" | "high"> = { power: "high", water: "high" };
/** Server wording, as the live triage and feed write it; the interface translates it. */
const OBSERVATION_SOURCE = "Utility feed";
const REPORT_SOURCE = "Resident report (unverified identity)";
const TICKET_PREFIX: Record<string, string> = {
  "demo-electricity": "ELE", "demo-water": "WOD", "demo-roads": "DRO", "demo-transit": "KOM",
  "demo-waste": "OCZ", "demo-greenery": "ZIE", "demo-air": "SRO",
};
const TICKET_EVENT: Record<FixtureWork["steps"][number]["status"], string> = {
  acknowledged: "acknowledged", in_progress: "work_started", resolved: "resolved",
};

const DIETLA: Omit<FixtureReport, "owner" | "minutesAgo" | "summary" | "original" | "lat" | "lng" | "number" | "channel"> = {
  category_id: "power", issue_type: "power_outage", street: "Józefa Dietla", scope: "street",
};

async function insertReport(client: PoolClient, owners: string[], report: FixtureReport, triage: {
  state: "pending" | "needs_review"; reason?: string; note?: string; candidates?: object[];
}): Promise<string> {
  const observedAt = new Date(Date.now() - (report.minutesAgo + 4) * 60_000);
  const label = `${report.street.startsWith("plac") || report.street.startsWith("Rondo") ? "" : "ul. "}${report.street} ${report.number}`.trim();
  const severity = report.severity ?? DEFAULT_SEVERITY[report.category_id] ?? "medium";
  const district = report.district ?? "Stare Miasto";
  const fields = {
    category_id: report.category_id, issue_type: report.issue_type, title: report.summary, description: report.original,
    severity, observed_at: observedAt.toISOString(), observed_time_state: "known", scope: report.scope, urgent: false,
    location: {
      candidate_id: null, lat: report.lat, lng: report.lng, label, street: report.street, building_number: report.number,
      district, precision: "building", source: "map_pin", unit: report.unit ?? null,
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
             $12, $13, $14, $23, 'building', 'map_pin', $15, 'known', $16, $17, $18, $19,
             CASE WHEN $18::text IS NULL THEN NULL ELSE now() END, $20, now() - $21 * interval '1 minute')
     RETURNING id`,
    [
      owners[report.owner], draft.rows[0].id, draft.rows[0].submission_key, report.channel, report.category_id,
      report.issue_type, report.summary, report.original, report.lat, report.lng, label, report.street, report.number,
      report.unit ?? null, observedAt, report.scope, triage.state, triage.reason ?? null, triage.note ?? null,
      JSON.stringify(triage.candidates ?? []), report.minutesAgo, severity, district,
    ],
  );
  await client.query("UPDATE report_drafts SET report_id = $1, submitted_revision = 1 WHERE id = $2", [inserted.rows[0].id, draft.rows[0].id]);
  return inserted.rows[0].id;
}

async function audit(client: PoolClient, incidentId: string, role: string, operation: string, minutesAgo: number, reason: string | null = null) {
  await client.query(
    `INSERT INTO audit_events (occurred_at, actor_kind, actor_role, operation, entity_type, entity_id, outcome, reason, correlation_id)
     VALUES (now() - $1 * interval '1 minute', 'system', $2, $3, 'incident', $4, 'seeded', $5, 'seed')`,
    [minutesAgo, role, operation, incidentId, reason],
  );
}

/** An approved, sent proposal with its ticket and the institution's later steps. */
async function insertWork(client: PoolClient, incidentId: string, fixture: FixtureIncident, area: string, supporters: number) {
  const work = fixture.work!;
  const institutionId = fixture.institutionId!;
  const payload = [
    { key: "Issue", value: fixture.title },
    { key: "Area", value: area },
    { key: "Residents reporting", value: String(supporters) },
  ];
  const proposal = await client.query<{ id: string }>(
    `INSERT INTO action_proposals
       (id, incident_id, version, incident_version, institution_id, action, payload, evidence_ids, explanation, state,
        created_by, created_at, decided_at, approved_incident_version, execution_key, execution_attempts, executed_at)
     SELECT id, $1, 1, 1, $2, 'create_service_ticket', $3,
            ARRAY(SELECT e.id FROM incident_evidence e WHERE e.incident_id = $1 AND e.state <> 'missing'),
            '', 'executed', 'Rule-based proposer',
            now() - ($4 + 5) * interval '1 minute', now() - $4 * interval '1 minute', 1, 'execute:proposal:' || id, 1,
            now() - $4 * interval '1 minute'
     FROM (SELECT gen_random_uuid() AS id) generated
     RETURNING id`,
    [incidentId, institutionId, JSON.stringify(payload), work.sentMinutesAgo],
  );
  const last = work.steps.at(-1);
  const status = last?.status ?? "created";
  const ticket = await client.query<{ id: string; reference: string }>(
    `INSERT INTO service_tickets (reference, incident_id, proposal_id, institution_id, payload, status, version, result_note, created_at, updated_at)
     VALUES ($1 || '-26-' || lpad(nextval('service_ticket_reference_seq')::text, 6, '0'), $2, $3, $4, $5, $6, $7, $8,
             now() - $9 * interval '1 minute', now() - $10 * interval '1 minute')
     RETURNING id, reference`,
    [
      TICKET_PREFIX[institutionId] ?? "TKT", incidentId, proposal.rows[0].id, institutionId, JSON.stringify(payload), status,
      work.steps.length + 1, status === "resolved" ? (last?.note ?? null) : null, work.sentMinutesAgo, last?.minutesAgo ?? work.sentMinutesAgo,
    ],
  );
  await client.query(
    "INSERT INTO service_ticket_events (ticket_id, status, occurred_at) VALUES ($1, 'created', now() - $2 * interval '1 minute')",
    [ticket.rows[0].id, work.sentMinutesAgo],
  );
  await client.query("INSERT INTO incident_events (incident_id, kind, occurred_at) VALUES ($1, 'assigned', now() - $2 * interval '1 minute')", [incidentId, work.sentMinutesAgo]);
  await audit(client, incidentId, "official", "proposal.approve", work.sentMinutesAgo);
  await audit(client, incidentId, "executor", "proposal.execute", work.sentMinutesAgo, ticket.rows[0].reference);
  for (const step of work.steps) {
    await client.query(
      "INSERT INTO service_ticket_events (ticket_id, status, note, occurred_at) VALUES ($1, $2, $3, now() - $4 * interval '1 minute')",
      [ticket.rows[0].id, step.status, step.note ?? null, step.minutesAgo],
    );
    await client.query("INSERT INTO incident_events (incident_id, kind, occurred_at) VALUES ($1, $2, now() - $3 * interval '1 minute')", [incidentId, TICKET_EVENT[step.status], step.minutesAgo]);
    await audit(client, incidentId, "institution", "ticket.update", step.minutesAgo, step.note ?? null);
  }
  const responseStatus = status === "resolved" ? "resolved" : status === "in_progress" ? "in_progress" : "assigned";
  await client.query(
    "UPDATE incidents SET response_status = $1, version = version + $2, updated_at = now() - $3 * interval '1 minute' WHERE id = $4",
    [responseStatus, work.steps.length + 1, last?.minutesAgo ?? work.sentMinutesAgo, incidentId],
  );
}

async function insertIncident(client: PoolClient, owners: string[], fixture: FixtureIncident): Promise<string> {
  const { reports } = fixture;
  const first = reports[0];
  const scope = first.scope === "building" ? "building" : "street";
  const street = `${first.street.startsWith("plac") || first.street.startsWith("Rondo") ? "" : "ul. "}${first.street}`;
  const publicLabel = scope === "building" ? `${street} ${first.number}` : street;
  const district = first.district ?? "Stare Miasto";
  const anchorObservedAt = new Date(Date.now() - (first.minutesAgo + 4) * 60_000);
  const supporters = new Set(reports.map((report) => report.owner)).size;
  const incident = await client.query<{ id: string }>(
    `INSERT INTO incidents
       (reference, category_id, issue_type, title, anchor_lat, anchor_lng, anchor_observed_at, service_area_id, street_key,
        building_key, scope, public_label, public_precision, district, assessment, response_status, support_count, urgent,
        responsible_institution_id, responsibility_rule_id, review_reason, review_note, review_since, created_at, updated_at)
     VALUES ('INC-26-' || lpad(nextval('incident_reference_seq')::text, 6, '0'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
             $10, $12, $13, 'triaged', $14, $15, $16, $17, $18, $19,
             CASE WHEN $18::text IS NULL THEN NULL ELSE now() - $20 * interval '1 minute' END,
             now() - $20 * interval '1 minute', now() - $21 * interval '1 minute')
     RETURNING id`,
    [
      first.category_id, first.issue_type, fixture.title, first.lat, first.lng,
      anchorObservedAt, serviceAreaId(first), streetKey(first.street), buildingKey(first.street, first.number), scope,
      publicLabel, district, supporters >= 2 ? "corroborated" : "suspected", supporters, fixture.urgent ?? false,
      fixture.institutionId, fixture.ruleId, fixture.review?.reason ?? null, fixture.review?.note ?? null, first.minutesAgo,
      Math.min(...reports.map((report) => report.minutesAgo)),
    ],
  );
  const incidentId = incident.rows[0].id;
  await client.query("INSERT INTO incident_events (incident_id, kind, occurred_at) VALUES ($1, 'reported', now() - $2 * interval '1 minute')", [incidentId, first.minutesAgo]);
  await audit(client, incidentId, "triage", "incident.create", first.minutesAgo);
  if (supporters >= 2) {
    await client.query("INSERT INTO incident_events (incident_id, kind, occurred_at) VALUES ($1, 'corroborated', now() - $2 * interval '1 minute')", [incidentId, reports[1].minutesAgo]);
  }
  for (const report of reports) {
    const reportId = await insertReport(client, owners, report, { state: "pending" });
    await client.query("UPDATE reports SET triage_state = 'linked', incident_id = $1, version = 2 WHERE id = $2", [incidentId, reportId]);
    await client.query(
      "INSERT INTO incident_report_links (report_id, incident_id, linked_by, reason) VALUES ($1, $2, 'seed', 'Powiązanie z danych początkowych')",
      [reportId, incidentId],
    );
    await client.query(
      `INSERT INTO incident_evidence (incident_id, report_id, kind, label, source, observed_at)
       SELECT $1, id, 'report', reference || ' · ' || initcap(channel) || ' report', $3, observed_at
       FROM reports WHERE id = $2`,
      [incidentId, reportId, REPORT_SOURCE],
    );
    if (report !== first) await audit(client, incidentId, "triage", "report.link", report.minutesAgo);
  }
  if (fixture.observation) {
    const observation = fixture.observation;
    await client.query(
      `INSERT INTO incident_evidence (incident_id, kind, label, source, observed_at, state, note)
       VALUES ($1, 'observation', $2, $3, $4, $5, $6)`,
      [incidentId, observation.label, OBSERVATION_SOURCE, observation.state === "missing" ? null : new Date(anchorObservedAt.getTime() + 120_000), observation.state, observation.note],
    );
  }
  if (fixture.work) await insertWork(client, incidentId, fixture, `${publicLabel}, ${district}`, supporters);
  return incidentId;
}

async function createOwners(client: PoolClient, count: number): Promise<string[]> {
  const owners: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const actor = await client.query<{ id: string }>("INSERT INTO actors (role, identity_kind) VALUES ('resident', 'guest') RETURNING id");
    owners.push(actor.rows[0].id);
  }
  return owners;
}

async function markSet(client: PoolClient, operation: string, incidentId: string) {
  await client.query(
    `INSERT INTO audit_events (actor_kind, actor_role, operation, entity_type, entity_id, outcome, correlation_id)
     VALUES ('system', 'seed', $1, 'incident', $2, 'seeded', 'seed')`,
    [operation, incidentId],
  );
}

/** Set 1: the Stare Miasto outage, a burst pipe and two reports waiting for review. */
async function seedSetOne(client: PoolClient) {
  const owners = await createOwners(client, 4);
  const outage = await insertIncident(client, owners, {
    title: "Awaria prądu w kamienicach i sklepach", institutionId: "demo-electricity", ruleId: "demo-rule-power",
    observation: { label: "Supply interrupted on the local feeder", state: "current", note: null },
    reports: [
      { ...DIETLA, owner: 0, minutesAgo: 40, channel: "voice", lat: 50.05806, lng: 19.94532, number: "44",
        summary: "Brak prądu na całej ulicy", original: "Nie ma prądu w całym budynku od około drugiej. Latarnie na ulicy też nie świecą." },
      { ...DIETLA, owner: 1, minutesAgo: 35, channel: "form", lat: 50.0579, lng: 19.946, number: "46",
        summary: "Brak prądu wzdłuż Dietla", original: "Brak prądu u nas i u sąsiadów naprzeciwko." },
      { ...DIETLA, owner: 2, minutesAgo: 30, channel: "form", lat: 50.0576, lng: 19.947, number: "52",
        summary: "Awaria na Dietla, sklepy bez prądu", original: "Sklepy na parterze są ciemne, cała ulica bez prądu." },
    ],
  });

  await insertIncident(client, owners, {
    title: "Woda wypływa spod chodnika", institutionId: "demo-water", ruleId: "demo-rule-water-pipe",
    observation: { label: "No supply reading available", state: "missing", note: "No feed is configured for this area and category." },
    reports: [
      { owner: 1, minutesAgo: 75, channel: "form", category_id: "water", issue_type: "burst_pipe", scope: "street",
        lat: 50.0655, lng: 19.93, street: "Karmelicka", number: "20", district: "Krowodrza",
        summary: "Woda płynie ulicą", original: "Woda leje się spod chodnika przy Karmelickiej 20." },
    ],
  });

  await insertReport(client, owners, {
    ...DIETLA, owner: 3, minutesAgo: 20, channel: "voice", lat: 50.0577, lng: 19.9466, number: "50", unit: "m. 4", scope: "unit",
    summary: "Brak prądu tylko w jednym mieszkaniu", original: "Tylko u mnie w mieszkaniu nie ma prądu, na klatce jest światło.",
  }, {
    // Server wording, translated in the interface.
    state: "needs_review", reason: "private_scope", note: "One flat or unit only. Kept private until the scope is reviewed.",
    candidates: [{ incident_id: outage, distance_m: 97, minutes_apart: 20 }],
  });
  await insertReport(client, owners, {
    owner: 0, minutesAgo: 15, channel: "form", category_id: "water", issue_type: "blocked_drain", scope: "street",
    lat: 50.057, lng: 19.9446, street: "Starowiślna", number: "30", district: "Kazimierz",
    summary: "Zatkana studzienka, woda stoi na przejściu", original: "Studzienka zatkana, woda stoi na przejściu dla pieszych.",
  }, { state: "needs_review", reason: "needs_link", note: "Przykład ręcznego przeglądu: sprawdź studzienkę i odpowiedzialność przed utworzeniem zdarzenia." });

  await markSet(client, "demo.fixtures", outage);
}

/** Set 2: every other category, plus incidents already sent, in progress and resolved. */
async function seedSetTwo(client: PoolClient) {
  const owners = await createOwners(client, 6);
  const first = await insertIncident(client, owners, {
    title: "Dziura w jezdni przed przejściem", institutionId: "demo-roads", ruleId: "demo-rule-roads",
    reports: [
      { owner: 0, minutesAgo: 95, channel: "form", category_id: "roads", issue_type: "pothole", scope: "street", district: "Kazimierz",
        lat: 50.04772, lng: 19.93347, street: "Krakowska", number: "41",
        summary: "Głęboka dziura przed przejściem", original: "Głęboka dziura na prawym pasie przed przejściem, samochody gwałtownie hamują." },
      { owner: 1, minutesAgo: 70, channel: "voice", category_id: "roads", issue_type: "pothole", scope: "street", district: "Kazimierz",
        lat: 50.04751, lng: 19.93362, street: "Krakowska", number: "45",
        summary: "Wyrwa w asfalcie, groźna dla rowerów", original: "Wjechałem rowerem w wyrwę w asfalcie przy Krakowskiej, łatwo o wypadek." },
    ],
  });
  await insertIncident(client, owners, {
    title: "Awaria tablicy odjazdów", institutionId: "demo-transit", ruleId: "demo-rule-transit",
    reports: [
      { owner: 2, minutesAgo: 42, channel: "form", category_id: "transit", issue_type: "transit_disruption", scope: "street", district: "Grzegórzki",
        lat: 50.06573, lng: 19.95962, street: "Rondo Mogilskie", number: "",
        summary: "Tablica odjazdów nie działa", original: "Tablica z odjazdami na przystanku nie działa, a rozkład jest zerwany." },
    ],
  });
  await insertIncident(client, owners, {
    title: "Przepełnione kosze na śmieci", institutionId: "demo-waste", ruleId: "demo-rule-waste",
    work: { sentMinutesAgo: 265, steps: [
      { status: "acknowledged", minutesAgo: 240 },
      { status: "in_progress", minutesAgo: 60, note: "Dodatkowy odbiór zaplanowany na dziś." },
    ] },
    reports: [
      { owner: 3, minutesAgo: 300, channel: "form", category_id: "waste", issue_type: "overflowing_bin", scope: "street", district: "Kazimierz",
        lat: 50.05141, lng: 19.94478, street: "plac Nowy", number: "4",
        summary: "Przepełnione kosze przy placu", original: "Kosze przy placu przepełnione od weekendu, śmieci leżą na chodniku." },
      { owner: 4, minutesAgo: 280, channel: "voice", category_id: "waste", issue_type: "overflowing_bin", scope: "street", district: "Kazimierz",
        lat: 50.05156, lng: 19.94452, street: "plac Nowy", number: "7",
        summary: "Worki ze śmieciami przy okrąglaku", original: "Przy okrąglaku stos worków i rozwiane opakowania, mewy wszystko roznoszą." },
    ],
  });
  await insertIncident(client, owners, {
    title: "Złamany konar nad alejką", institutionId: null, ruleId: null, urgent: true,
    review: { reason: "urgent", note: "Wiszący konar nad ławkami może spaść. Jeśli komuś grozi niebezpieczeństwo, dzwoń pod 112." },
    reports: [
      { owner: 5, minutesAgo: 14, channel: "voice", category_id: "greenery", issue_type: "fallen_tree", scope: "street",
        lat: 50.06468, lng: 19.93934, street: "Basztowa", number: "15",
        summary: "Konar zablokował alejkę na Plantach", original: "Na Plantach spadł duży konar i zablokował alejkę. Drugi wisi nad ławkami." },
    ],
  });
  await insertIncident(client, owners, {
    title: "Niedziałająca winda na perony", institutionId: "demo-roads", ruleId: "demo-rule-accessibility",
    work: { sentMinutesAgo: 235, steps: [{ status: "acknowledged", minutesAgo: 180, note: "Serwis windy zamówiony na jutro rano." }] },
    reports: [
      { owner: 0, minutesAgo: 260, channel: "form", category_id: "accessibility", issue_type: "broken_lift", scope: "building",
        lat: 50.06686, lng: 19.94716, street: "Pawia", number: "5",
        summary: "Winda na peron nie działa", original: "Winda na peron przy dworcu nie działa, nie da się wjechać wózkiem." },
    ],
  });
  await insertIncident(client, owners, {
    title: "Nocny hałas z budowy", institutionId: null, ruleId: null,
    review: { reason: "needs_responsibility", note: "Hałas z prywatnej budowy może nie podlegać żadnej służbie. Wybierz, kto ma odpowiedzieć." },
    reports: [
      { owner: 1, minutesAgo: 22, channel: "form", category_id: "air", issue_type: "noise", scope: "building",
        lat: 50.06041, lng: 19.93571, street: "Szewska", number: "20",
        summary: "Agregat na budowie pracuje w nocy", original: "Od kilku nocy głośna praca agregatu na budowie po 23:00." },
    ],
  });
  await insertIncident(client, owners, {
    title: "Niedziałające latarnie", institutionId: "demo-electricity", ruleId: "demo-rule-power",
    work: { sentMinutesAgo: 150, steps: [
      { status: "acknowledged", minutesAgo: 120 },
      { status: "in_progress", minutesAgo: 45, note: "Ekipa wymienia sterownik oświetlenia." },
    ] },
    reports: [
      { owner: 2, minutesAgo: 190, channel: "voice", category_id: "power", issue_type: "street_light_fault", scope: "street",
        lat: 50.05722, lng: 19.93763, street: "Grodzka", number: "32",
        summary: "Ciemno na całej Grodzkiej", original: "Po zmroku na Grodzkiej nie świeci żadna latarnia, turyści idą po ciemku." },
      { owner: 3, minutesAgo: 170, channel: "form", category_id: "power", issue_type: "street_light_fault", scope: "street",
        lat: 50.05664, lng: 19.93784, street: "Grodzka", number: "48",
        summary: "Latarnie nie świecą od Senackiej", original: "Od Senackiej do Placu Wszystkich Świętych latarnie nie świecą." },
    ],
  });
  await insertIncident(client, owners, {
    title: "Brak wody w kranach", institutionId: "demo-water", ruleId: "demo-rule-water-outage",
    work: { sentMinutesAgo: 55, steps: [{ status: "acknowledged", minutesAgo: 25, note: "Ekipa jedzie na miejsce." }] },
    reports: [
      { owner: 4, minutesAgo: 80, channel: "voice", category_id: "water", issue_type: "water_outage", scope: "street", district: "Krowodrza",
        lat: 50.07068, lng: 19.93768, street: "Długa", number: "56",
        summary: "Brak wody w kilku kamienicach", original: "U nas i w dwóch sąsiednich kamienicach od rana nie ma wody." },
    ],
  });
  await insertIncident(client, owners, {
    title: "Awaria prądu w kilku budynkach", institutionId: "demo-electricity", ruleId: "demo-rule-power",
    work: { sentMinutesAgo: 900, steps: [
      { status: "acknowledged", minutesAgo: 880 },
      { status: "in_progress", minutesAgo: 840 },
      { status: "resolved", minutesAgo: 600, note: "Wymieniono uszkodzony kabel, zasilanie przywrócone." },
    ] },
    reports: [
      { owner: 5, minutesAgo: 930, channel: "form", category_id: "power", issue_type: "power_outage", scope: "street", district: "Krowodrza",
        lat: 50.07113, lng: 19.91742, street: "Juliusza Lea", number: "114",
        summary: "Brak prądu w bloku", original: "Od rana nie ma prądu w całym bloku i w sklepie obok." },
    ],
  });
  await insertReport(client, owners, {
    owner: 0, minutesAgo: 8, channel: "form", category_id: "waste", issue_type: "illegal_dumping", scope: "street", district: "Podgórze",
    lat: 50.04408, lng: 19.95596, street: "Kalwaryjska", number: "40",
    summary: "Gruz wyrzucony przy chodniku", original: "Ktoś w nocy wyrzucił worki z gruzem przy chodniku na Kalwaryjskiej.",
  }, { state: "needs_review", reason: "needs_link", note: "Przykład ręcznego przeglądu: sprawdź lokalizację i odpowiedzialność przed utworzeniem zdarzenia." });
  await markSet(client, "demo.fixtures.v2", first);
}

/** Set 1 was first seeded in English; rewrite those rows in Polish once. */
async function localizeSetOne(client: PoolClient) {
  const pairs: [string, string, string][] = [
    ["reports", "summary", "No power on the whole street|Brak prądu na całej ulicy"],
    ["reports", "summary", "Power is out along Dietla|Brak prądu wzdłuż Dietla"],
    ["reports", "summary", "Outage on Dietla, shops are dark|Awaria na Dietla, sklepy bez prądu"],
    ["reports", "summary", "Water running down the street|Woda płynie ulicą"],
    ["reports", "summary", "No power in one flat only|Brak prądu tylko w jednym mieszkaniu"],
    ["reports", "summary", "Blocked drain, water pooling at the crossing|Zatkana studzienka, woda stoi na przejściu"],
    ["reports", "review_note", "Automatic grouping covers power outages only. Triage this report manually.|Przykład ręcznego przeglądu: sprawdź lokalizację i odpowiedzialność przed utworzeniem zdarzenia."],
    ["incidents", "title", "Power outage on ul. Józefa Dietla|Awaria prądu w kamienicach i sklepach"],
    ["incidents", "title", "Burst pipe or leak on ul. Karmelicka|Woda wypływa spod chodnika"],
    ["incident_report_links", "reason", "Explicit initial data link|Powiązanie z danych początkowych"],
  ];
  for (const [table, column, pair] of pairs) {
    const [from, to] = pair.split("|");
    await client.query(`UPDATE ${table} SET ${column} = $2 WHERE ${column} = $1`, [from, to]);
  }
  // Severity arrived after set 1 was first seeded; outages are urgent, the drain affects daily life.
  await client.query(
    `UPDATE reports SET severity = CASE WHEN category_id IN ('power', 'water') AND issue_type <> 'blocked_drain' THEN 'high' ELSE 'medium' END
     WHERE severity IS NULL AND summary = ANY($1::text[])`,
    [pairs.filter(([table, column]) => table === "reports" && column === "summary").map(([, , pair]) => pair.split("|")[1])],
  );
  await client.query(
    `UPDATE action_proposals SET payload = replace(replace(payload::text, 'Power outage on ul. Józefa Dietla', 'Awaria prądu w kamienicach i sklepach'),
       'Burst pipe or leak on ul. Karmelicka', 'Woda wypływa spod chodnika')::jsonb
     WHERE payload::text LIKE '%Power outage on%' OR payload::text LIKE '%Burst pipe or leak on%'`,
  );
}

/** Idempotent: each set runs once per database, marked by an audit event. Returns whether anything was added. */
export async function seedDemoFixtures(client: PoolClient): Promise<boolean> {
  const marked = async (operation: string) => Boolean((await client.query("SELECT 1 FROM audit_events WHERE operation = $1 LIMIT 1", [operation])).rowCount);
  const hasOne = await marked("demo.fixtures");
  const hasTwo = await marked("demo.fixtures.v2");
  if (hasOne && hasTwo) return false;
  if (hasOne) await localizeSetOne(client);
  else await seedSetOne(client);
  if (!hasTwo) await seedSetTwo(client);
  return true;
}
