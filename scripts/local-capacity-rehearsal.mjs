import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";

// Manual, bounded HTTP measurement. Keep this local and independent of app dependencies.
const ORIGIN = "http://localhost:3000";
const RESIDENTS = 15;
const DURATION_MS = 30_000;
const INTERVAL_MS = 1_000;
const TIMEOUT_MS = 10_000;
const QUERIES = ["power outage", "burst pipe", "zzzz-capacity-no-match"];
const ENDPOINTS = ["incidents", "categories", "search"];
const rows = [];
let inFlight = 0;
let maxInFlight = 0;

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const string = (value) => typeof value === "string";
const nonempty = (value) => string(value) && value.length > 0;
const integer = (value) => Number.isInteger(value) && value >= 0;
const timestamp = (value) => string(value) && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const oneOf = (...values) => (value) => values.includes(value);
const nullable = (check) => (value) => value === null || check(value);
const array = (check) => (value) => Array.isArray(value) && value.every(check);
const shape = (fields) => (value) => object(value)
  && Object.keys(value).length === Object.keys(fields).length
  && Object.entries(fields).every(([key, check]) => Object.hasOwn(value, key) && check(value[key]));
const coordinate = (bound) => (value) => Number.isFinite(value) && Math.abs(value) <= bound;

// Mirrors the public wire shapes, including allowlists, without importing app code.
const incident = shape({
  id: nonempty, reference: nonempty, category_id: string, issue_type: string,
  public_summary: string, scope: oneOf("building", "street"),
  assessment: oneOf("suspected", "corroborated", "verified", "disputed"),
  response_status: oneOf("new", "triaged", "assigned", "in_progress", "resolved", "closed"),
  support_count: integer, accepts_contributions: (v) => typeof v === "boolean",
  viewer_support: nullable(oneOf("reporter", "contributor")),
  public_location: shape({ lat: coordinate(90), lng: coordinate(180), label: string, precision: oneOf("street", "building") }),
  created_at: timestamp, updated_at: timestamp,
  timeline: array(shape({
    id: string, occurred_at: timestamp, text: string,
    kind: oneOf("reported", "corroborated", "verified", "disputed", "assigned", "acknowledged", "work_started", "resolved", "returned_to_review", "closed", "reopened"),
  })),
  provenance: oneOf("demo", "live"),
});
const category = shape({ id: (v) => string(v) && /^[a-z][a-z0-9-]*$/.test(v), label: nonempty, description: string });
const searchItem = shape({
  record_type: oneOf("incident"), record_id: nonempty,
  source_version: (v) => integer(v) && v > 0,
  title: string, excerpt: string, category_id: nullable(string),
  score: Number.isFinite, indexed_at: timestamp,
});
const session = shape({
  actor: shape({ id: nonempty, role: oneOf("resident"), identity_kind: oneOf("guest"), institution_id: oneOf(null) }),
  expires_at: timestamp,
});
const validators = {
  session,
  categories: (data) => array(category)(data) && data.length > 0 && new Set(data.map((v) => v.id)).size === data.length,
  incidents: shape({ items: array(incident), next_cursor: nullable(string) }),
  search: shape({ status: oneOf("ready", "index_stale"), items: array(searchItem), next_cursor: oneOf(null) }),
};

async function request(phase, endpoint, path, cookie, method = "GET", query = null) {
  const row = { phase, endpoint, query, status: null, outcome: "transport_error" };
  const started = performance.now();
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  inFlight += 1;
  maxInFlight = Math.max(maxInFlight, inFlight);
  try {
    const response = await fetch(`${ORIGIN}${path}`, {
      method, signal, redirect: "error", cache: "no-store",
      headers: { Accept: "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(method === "POST" ? { Origin: ORIGIN } : {}) },
    });
    row.status = response.status;
    // Deadline includes full body consumption. Never log cookies or response contents.
    const text = await response.text();
    if (response.status !== (endpoint === "session" ? 201 : 200)) {
      row.outcome = "http_error";
      return null;
    }
    row.outcome = "invalid_response";
    if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) return null;
    let body;
    try { body = JSON.parse(text); } catch { return null; }
    // Current main still serves the labelled legacy catalogue; the map cutover uses the common envelope.
    const legacyCategories = endpoint === "categories" && shape({ categories: validators.categories })(body);
    const data = legacyCategories ? body.categories : body?.data;
    if (!legacyCategories && (!object(body) || !nonempty(body.correlation_id)
      || Object.keys(body).some((key) => !["data", "correlation_id", "version"].includes(key))
      || (Object.hasOwn(body, "version") && (!integer(body.version) || body.version < 1))
      || !validators[endpoint](data))) return null;
    if (endpoint === "session") {
      const issuedCookie = response.headers.getSetCookie().find((value) => value.startsWith("smart_city_session="))?.split(";")[0];
      if (!issuedCookie || !/^smart_city_session=[A-Za-z0-9_-]{43}$/.test(issuedCookie)) return null;
      row.outcome = "valid";
      return { cookie: issuedCookie, actorId: data.actor.id };
    }
    row.outcome = "valid";
    const items = endpoint === "categories" ? data : data.items;
    row.items = items.length;
    row.paginated = endpoint === "incidents" && data.next_cursor !== null;
    if (endpoint === "incidents") row.provenance = [...new Set(items.map((value) => value.provenance))];
    if (endpoint === "search") row.applicationStatus = data.status;
    if (endpoint === "categories") row.categoryContract = legacyCategories ? "legacy_demo" : "common_envelope";
    return true;
  } catch {
    row.outcome = signal.aborted ? "timeout" : "transport_error";
    return null;
  } finally {
    row.latencyMs = performance.now() - started;
    rows.push(row);
    inFlight -= 1;
  }
}

function read(phase, endpoint, resident, queryIndex) {
  const query = endpoint === "search" ? QUERIES[queryIndex % QUERIES.length] : null;
  const path = endpoint === "incidents" ? "/api/incidents?limit=200"
    : endpoint === "categories" ? "/api/categories"
    : `/api/search/records?${new URLSearchParams({ q: query, mode: "keyword", limit: "10", record_type: "incident" })}`;
  return request(phase, endpoint, path, resident.cookie, "GET", query);
}

function summarize(samples) {
  const latencies = samples.map((row) => row.latencyMs).sort((a, b) => a - b);
  const valid = samples.filter((row) => row.outcome === "valid");
  const sizes = valid.flatMap((row) => row.items === undefined ? [] : [row.items]);
  const percentile = (fraction) => latencies.length ? Math.round(latencies[Math.ceil(latencies.length * fraction) - 1] * 10) / 10 : null;
  return {
    attempts: samples.length,
    outcomes: Object.fromEntries(["valid", "timeout", "http_error", "invalid_response", "transport_error"].map((outcome) => [outcome, samples.filter((row) => row.outcome === outcome).length])),
    http_statuses: Object.fromEntries([...new Set(samples.map((row) => row.status).filter((status) => status !== null))].map((status) => [status, samples.filter((row) => row.status === status).length])),
    // Attempt latency includes failed attempts and timeouts, avoiding success-only bias.
    attempt_latency_ms: { p50: percentile(0.5), p95: percentile(0.95), max: percentile(1) },
    item_count: sizes.length ? { min: Math.min(...sizes), max: Math.max(...sizes) } : null,
    empty_responses: valid.filter((row) => row.items === 0).length,
    paginated_responses: valid.filter((row) => row.paginated).length,
    search_statuses: { ready: valid.filter((row) => row.applicationStatus === "ready").length, index_stale: valid.filter((row) => row.applicationStatus === "index_stale").length },
    incident_provenance: [...new Set(valid.flatMap((row) => row.provenance ?? []))],
    category_contracts: { common_envelope: valid.filter((row) => row.categoryContract === "common_envelope").length, legacy_demo: valid.filter((row) => row.categoryContract === "legacy_demo").length },
  };
}

async function main() {
  if (process.argv.length > 2) throw new Error("No arguments supported. Target and workload are fixed; see docs/local-capacity-rehearsal.md.");
  const startedAt = new Date().toISOString();
  let revision = "unknown";
  try { revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: new URL("..", import.meta.url), encoding: "utf8" }).trim(); } catch { /* Running a copied helper is supported. */ }
  const residents = [];
  console.error("Creating 15 guest sessions sequentially; only session setup writes to the database.");
  for (let i = 0; i < RESIDENTS; i += 1) {
    const issued = await request("setup", "session", "/api/auth/guest", null, "POST");
    if (!issued || residents.some((resident) => resident.actorId === issued.actorId)) {
      console.log(JSON.stringify({ started_at: startedAt, helper_checkout_revision: revision, setup: summarize(rows) }, null, 2));
      throw new Error("Distinct guest session setup failed; public-read phases were not started.");
    }
    residents.push(issued);
  }
  console.error("First-observed pass: 15 concurrent readers per endpoint. The shared app has not been reset.");
  const firstStarted = performance.now();
  for (const endpoint of ENDPOINTS) {
    await Promise.all(residents.map((resident, i) => read("first_observed", endpoint, resident, i)));
  }
  const firstElapsed = performance.now() - firstStarted;
  console.error("Warm pass: 30 seconds, 1 request/resident/second, rotating incidents/categories/keyword search.");
  const warmStarted = performance.now();
  let skippedSlots = 0;
  let maxScheduleLagMs = 0;
  await Promise.all(residents.map(async (resident, residentIndex) => {
    // Each resident owns one in-flight request. Slow requests skip slots; never catch up in a burst.
    let slot = 0;
    while (slot < DURATION_MS / INTERVAL_MS) {
      const due = warmStarted + slot * INTERVAL_MS;
      await sleep(Math.max(0, due - performance.now()));
      const now = performance.now();
      if (now >= warmStarted + DURATION_MS) {
        skippedSlots += DURATION_MS / INTERVAL_MS - slot;
        break;
      }
      maxScheduleLagMs = Math.max(maxScheduleLagMs, now - due);
      await read("warm", ENDPOINTS[slot % ENDPOINTS.length], resident, residentIndex + Math.floor(slot / 3));
      const nextSlot = Math.max(slot + 1, Math.ceil((performance.now() - warmStarted) / INTERVAL_MS));
      skippedSlots += Math.min(nextSlot, DURATION_MS / INTERVAL_MS) - slot - 1;
      slot = nextSlot;
    }
  }));
  // Preserve the fixed observation window when the final scheduled request finishes early.
  await sleep(Math.max(0, warmStarted + DURATION_MS - performance.now()));
  const summary = {
    started_at: startedAt, finished_at: new Date().toISOString(), helper_checkout_revision: revision,
    origin: ORIGIN, node_version: process.version, residents: residents.length,
    settings: { duration_ms: DURATION_MS, interval_ms_per_resident: INTERVAL_MS, timeout_ms: TIMEOUT_MS, search_mode: "keyword", queries: QUERIES },
    max_in_flight: maxInFlight,
    first_observed_elapsed_ms: Math.round(firstElapsed), warm_elapsed_including_drain_ms: Math.round(performance.now() - warmStarted),
    warm_scheduled_slots: RESIDENTS * DURATION_MS / INTERVAL_MS, warm_skipped_slots: skippedSlots,
    warm_max_schedule_lag_ms: Math.round(maxScheduleLagMs * 10) / 10,
    phases: Object.fromEntries(["setup", "first_observed", "warm"].map((phase) => [phase,
      Object.fromEntries(["session", ...ENDPOINTS].filter((endpoint) => rows.some((row) => row.phase === phase && row.endpoint === endpoint))
        .map((endpoint) => [endpoint, summarize(rows.filter((row) => row.phase === phase && row.endpoint === endpoint))])),
    ])),
    search_queries: Object.fromEntries(QUERIES.map((query) => [query, summarize(rows.filter((row) => row.query === query))])),
  };
  console.log(JSON.stringify(summary, null, 2));
  if (rows.some((row) => row.outcome !== "valid" || row.applicationStatus === "index_stale") || skippedSlots > 0) process.exitCode = 1;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
