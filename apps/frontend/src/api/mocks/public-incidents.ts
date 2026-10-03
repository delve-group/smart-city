import type { Contribution, PublicIncident } from "@/api/incidents/types";
import { mockWorkspace } from "./operations-store";

/** Explicit fictional reporter links, never identities fabricated from old numeric counters. */
const REPORTER_LINKS: Record<string, string> = {
  "r-311": "demo-dietla-a", "r-312": "demo-dietla-b", "r-318": "demo-dietla-c", "r-320": "demo-starowislna-a",
  "r-290": "demo-miodowa-a", "r-292": "demo-miodowa-b", "r-301": "demo-bernardynska-a", "r-303": "demo-bernardynska-b",
  "r-305": "demo-stradomska-a", "r-271": "demo-podgorski-a",
};
const KEY = "mradar-mock-incident-memberships";
let memberships: Set<string> | null = null;
function mySupport() {
  if (memberships) return memberships;
  try { memberships = new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]); }
  catch { memberships = new Set(); }
  return memberships;
}

/** UI-only allowlist; private mock report text, evidence and internal history never cross it. */
export function mockPublicIncidents(): PublicIncident[] {
  return mockWorkspace().incidents.map((incident) => {
    const membership = mySupport().has(incident.id);
    const supporters = new Set(incident.report_ids.map((id) => REPORTER_LINKS[id]).filter(Boolean));
    return {
      id: incident.id, reference: incident.reference, category_id: incident.category_id, issue_type: incident.issue_type,
      public_summary: `${incident.category_id === "power" ? "Power outage" : "Reported service issue"} at ${incident.address}.`,
      scope: "street", assessment: incident.assessment, response_status: incident.response_status,
      support_count: supporters.size + Number(membership), severity: incident.urgent ? "high" : "medium", accepts_contributions: !["resolved", "closed"].includes(incident.response_status),
      viewer_support: membership ? "contributor" : null,
      public_location: { lat: incident.lat, lng: incident.lng, label: incident.address, precision: "street" },
      created_at: incident.history[0]?.at ?? incident.updated_at, updated_at: incident.updated_at,
      timeline: [{ id: `${incident.id}-reported`, kind: "reported", occurred_at: incident.history[0]?.at ?? incident.updated_at, text: "Fictional demo incident reported." }],
      provenance: "demo",
    };
  });
}
export function mockContribution(id: string): Contribution {
  const incident = mockPublicIncidents().find((candidate) => candidate.id === id);
  if (!incident) throw new Error("This UI mock incident no longer exists.");
  if (!incident.viewer_support && !incident.accepts_contributions) throw new Error("This UI mock incident is finished.");
  mySupport().add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...mySupport()])); } catch { /* Fictional memory-only preview still works. */ }
  return { incident_id: id, membership: "contributor", support_count: incident.support_count + Number(!incident.viewer_support), assessment: incident.assessment };
}
