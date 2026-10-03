import { createDraftSchema, updateDraftSchema, confirmDraftSchema, submitReportSchema, EMPTY_DRAFT_FIELDS, type IntakeDraft, type Report } from "@/server/reports/contracts";
import { mergeDraftFields, missingDraftFields, readbackSummary } from "@/server/reports/draft-rules";
import { ISSUE_TYPES } from "@/server/reports/issue-types";

/** UI-only browser fixture. It cannot authenticate, persist a real report or publish an incident. */
const KEY = "mradar-mock-intake-v1";
type State = { drafts: Record<string, IntakeDraft>; reports: Record<string, Report> };
let memory: State | null = null;
function state(): State {
  if (memory) return memory;
  try { const saved = localStorage.getItem(KEY); if (saved) return (memory = JSON.parse(saved) as State); } catch { /* Use memory when unavailable. */ }
  return (memory = { drafts: {}, reports: {} });
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* This mode also works in memory. */ } }
function stamp() { return new Date().toISOString(); }
function refresh(draft: IntakeDraft) {
  draft.missing_fields = missingDraftFields(draft.fields);
  draft.readback_summary = readbackSummary(draft.fields);
  draft.updated_at = stamp();
}

export function mockIntake(path: string, options?: RequestInit): unknown {
  const store = state();
  const method = options?.method ?? "GET";
  const body: unknown = options?.body ? JSON.parse(String(options.body)) : {};
  if (path === "/api/auth/guest") return { actor: { id: "mock-resident", role: "resident", identity_kind: "guest", institution_id: null }, expires_at: new Date(Date.now() + 30 * 86400000).toISOString() };
  if (path === "/api/issue-types") return { items: ISSUE_TYPES };
  if (path === "/api/report-drafts" && method === "POST") {
    const input = createDraftSchema.parse(body);
    const fields = mergeDraftFields(EMPTY_DRAFT_FIELDS, input.fields ?? {});
    const now = stamp();
    const draft: IntakeDraft = { id: crypto.randomUUID(), revision: 1, submission_key: crypto.randomUUID(), fields, missing_fields: missingDraftFields(fields), readback_summary: readbackSummary(fields), confirmation: null, submission: null, created_at: now, updated_at: now };
    store.drafts[draft.id] = draft; save(); return structuredClone(draft);
  }
  if (path === "/api/reports" && method === "POST") {
    const input = submitReportSchema.parse(body);
    const draft = store.drafts[input.draft_id];
    if (!draft) throw new Error("UI mock draft not found. Start a new mock report.");
    if (draft.submission) return structuredClone(store.reports[draft.submission.report_id]);
    if (input.revision !== draft.revision || draft.confirmation?.revision !== draft.revision) throw new Error("Confirm the current UI mock draft first.");
    const f = draft.fields;
    if (!f.category_id || !f.issue_type || !f.title || !f.location) throw new Error("Complete the UI mock draft first.");
    const sequence = String(Object.keys(store.reports).length + 1).padStart(6, "0");
    const report: Report = { id: crypto.randomUUID(), reference: `MR-${sequence}`, channel: "form", category_id: f.category_id, issue_type: f.issue_type, summary: f.title, original_observation: f.description ?? "", severity: f.severity, location: f.location, observed_at: f.observed_at, observed_time_state: f.observed_time_state, submitted_at: stamp(), scope: f.scope, urgent: f.urgent, triage_state: "pending", incident_id: null, resident_next_step: null, version: 1, provenance: "demo" };
    store.reports[report.id] = report;
    draft.submission = { report_id: report.id, reference: report.reference, triage_state: report.triage_state, submitted_at: report.submitted_at };
    save(); return structuredClone(report);
  }
  const reportId = path.match(/^\/api\/reports\/([^/]+)$/)?.[1];
  if (reportId && store.reports[reportId]) return structuredClone(store.reports[reportId]);
  const match = path.match(/^\/api\/report-drafts\/([^/]+)(\/confirmation)?$/);
  const draft = match && store.drafts[match[1]];
  if (!draft) throw new Error("UI mock draft not found. Start a new mock report.");
  if (method !== "GET" && draft.submission) throw new Error("This UI mock report is already submitted.");
  if (method === "PATCH") {
    const input = updateDraftSchema.parse(body);
    if (input.expected_revision !== draft.revision) throw new Error("The UI mock draft changed. Recover it before retrying.");
    draft.fields = mergeDraftFields(draft.fields, input.fields);
    draft.revision += 1; draft.confirmation = null; refresh(draft); save();
  } else if (match?.[2] && method === "POST") {
    const input = confirmDraftSchema.parse(body);
    if (input.revision !== draft.revision || draft.missing_fields.length) throw new Error("Complete and review the current UI mock draft first.");
    draft.confirmation = { revision: draft.revision, channel: input.channel, confirmed_at: stamp() }; save();
  }
  return structuredClone(draft);
}
