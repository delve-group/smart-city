/**
 * MOCK DATA for `npm run dev:ui` (see use-mocks.ts). Fictional incidents, reports and institutions at real Kraków streets, covering
 * every review-queue case: a ready proposal, an urgent report, an uncertain link, an
 * apartment-only report, failed triage, an institution rejection and finished work.
 * Times are relative to "now". Institutions are fictional demo services, not real companies.
 */
import type { HistoryDto, IncidentDto, InstitutionDto, OperationsReportDto, WorkspaceDto } from "@/api/operations/types";

const MINUTE = 60_000;

export const OFFICIAL = "City official";
export const AGENT = "Decision-maker agent";
export const TRIAGE = "Automatic triage";

export const INSTITUTIONS: InstitutionDto[] = [
  { id: "demo-electricity", name: "Electricity Operator", category_ids: ["power"], is_demo: true },
  { id: "demo-water", name: "Water Services", category_ids: ["water"], is_demo: true },
];

export function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const kx = 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.round(Math.hypot((a.lng - b.lng) * kx, (a.lat - b.lat) * 111_320));
}

export function createSeedWorkspace(): Omit<WorkspaceDto, "source" | "generated_at"> {
  const now = Date.now();
  const ago = (minutes: number) => new Date(now - minutes * MINUTE).toISOString();
  const ahead = (minutes: number) => new Date(now + minutes * MINUTE).toISOString();
  let historyId = 0;
  const event = (minutesAgo: number, actor: string, action: string, detail: string | null = null): HistoryDto => ({
    id: `H-${++historyId}`,
    at: ago(minutesAgo),
    actor,
    action,
    detail,
  });

  const report = (
    fields: Pick<OperationsReportDto, "id" | "reference" | "channel" | "category_id" | "summary" | "lat" | "lng" | "address"> &
      Partial<OperationsReportDto> & { minutesAgo: number },
  ): OperationsReportDto => {
    const { minutesAgo, ...rest } = fields;
    return {
      observed_at: ago(minutesAgo + 4),
      submitted_at: ago(minutesAgo),
      unit: null,
      triage_state: "linked",
      incident_id: null,
      version: 1,
      review: null,
      ...rest,
    };
  };

  const reports: OperationsReportDto[] = [
    // INC-0142: one street outage, three residents.
    report({ id: "r-311", reference: "R-311", channel: "voice", category_id: "power", minutesAgo: 34, incident_id: "inc-0142",
      summary: "No power in the whole building since about two o'clock. Street lights on the block are out too.",
      lat: 50.05806, lng: 19.94532, address: "ul. Józefa Dietla 44" }),
    report({ id: "r-312", reference: "R-312", channel: "form", category_id: "power", minutesAgo: 31, incident_id: "inc-0142",
      summary: "Shops on this part of Dietla have no electricity. Traffic lights at the crossing are dark.",
      lat: 50.05772, lng: 19.94611, address: "ul. Józefa Dietla 52" }),
    report({ id: "r-318", reference: "R-318", channel: "voice", category_id: "power", minutesAgo: 26, incident_id: "inc-0142",
      summary: "Power cut in my building and the one across the street.", observed_at: null,
      lat: 50.05834, lng: 19.94598, address: "ul. Józefa Dietla 47" }),
    // Apartment-only: stays private until reviewed.
    report({ id: "r-327", reference: "R-327", channel: "voice", category_id: "power", minutesAgo: 12, triage_state: "needs_review",
      summary: "No power in my flat only; the neighbours on my floor have power.", unit: "Flat 14",
      lat: 50.05797, lng: 19.94641, address: "ul. Józefa Dietla 54",
      review: { reason: "private_scope", note: "Only one flat is affected. Keep it private unless it belongs to the street outage.", since: ago(12),
        candidates: [{ incident_id: "inc-0142", distance_m: 61, minutes_apart: 22 }] } }),
    // INC-0145: urgent.
    report({ id: "r-320", reference: "R-320", channel: "voice", category_id: "power", minutesAgo: 9, incident_id: "inc-0145",
      summary: "Sparks and a burning smell from the cable box on the pavement. People are walking past it.",
      lat: 50.05523, lng: 19.94689, address: "ul. Starowiślna 60" }),
    // Uncertain link between two water incidents.
    report({ id: "r-325", reference: "R-325", channel: "form", category_id: "water", minutesAgo: 18, triage_state: "needs_review",
      summary: "Water is coming up between the paving stones and running down to the tram stop.",
      lat: 50.05356, lng: 19.93961, address: "ul. Stradomska 7",
      review: { reason: "needs_link", note: "Two active water incidents are within the matching limits.", since: ago(18),
        candidates: [
          { incident_id: "inc-0139", distance_m: 120, minutes_apart: 47 },
          { incident_id: "inc-0140", distance_m: 112, minutes_apart: 70 },
        ] } }),
    // Triage failed: needs a manual decision.
    report({ id: "r-330", reference: "R-330", channel: "form", category_id: "power", minutesAgo: 5, triage_state: "pending",
      summary: "Lights in the stairwell flicker every few minutes, the whole building.",
      lat: 50.05878, lng: 19.94871, address: "ul. Grzegórzecka 9",
      review: { reason: "pending_triage", note: "Nothing was grouped automatically. Decide by hand where it belongs.", since: ago(5), candidates: [] } }),
    // INC-0131: rejected by the institution.
    report({ id: "r-290", reference: "R-290", channel: "form", category_id: "power", minutesAgo: 190, incident_id: "inc-0131",
      summary: "All street lights on Miodowa are off after dark.", lat: 50.05204, lng: 19.94795, address: "ul. Miodowa 24" }),
    report({ id: "r-292", reference: "R-292", channel: "voice", category_id: "power", minutesAgo: 176, incident_id: "inc-0131",
      summary: "The street is completely dark between the synagogue and Starowiślna.", lat: 50.05188, lng: 19.94902, address: "ul. Miodowa 30" }),
    // INC-0139 / INC-0140: assigned to Water Services.
    report({ id: "r-301", reference: "R-301", channel: "voice", category_id: "water", minutesAgo: 65, incident_id: "inc-0139",
      summary: "Water bubbling out of the road near the church.", lat: 50.05301, lng: 19.93822, address: "ul. Bernardyńska 2" }),
    report({ id: "r-303", reference: "R-303", channel: "form", category_id: "water", minutesAgo: 58, incident_id: "inc-0139",
      summary: "Large puddle growing across the street, looks like a burst pipe.", lat: 50.05289, lng: 19.93851, address: "ul. Bernardyńska 4" }),
    report({ id: "r-305", reference: "R-305", channel: "voice", category_id: "water", minutesAgo: 88, incident_id: "inc-0140",
      summary: "Very low water pressure in the whole building since the morning.", lat: 50.05421, lng: 19.94058, address: "ul. Stradomska 15" }),
    // INC-0128: resolved, ready to close.
    report({ id: "r-271", reference: "R-271", channel: "form", category_id: "power", minutesAgo: 420, incident_id: "inc-0128",
      summary: "No electricity on the east side of the square.", lat: 50.04431, lng: 19.94953, address: "Rynek Podgórski 12" }),
  ];

  const evidenceFor = (ids: string[], minutesAgo: number) =>
    ids.map((id) => {
      const source = reports.find((candidate) => candidate.id === id)!;
      return {
        id: source.reference,
        kind: "report" as const,
        label: `${source.reference} · ${source.channel === "voice" ? "Voice" : "Form"} report`,
        source: "Resident report",
        observed_at: source.observed_at,
        retrieved_at: ago(minutesAgo),
        provenance: "demo" as const,
        state: "current" as const,
        note: source.observed_at ? null : "Observation time unknown.",
      };
    });

  const incidents: IncidentDto[] = [
    {
      id: "inc-0142", reference: "INC-0142", category_id: "power", issue_type: "power_outage",
      title: "Power outage on ul. Józefa Dietla", lat: 50.0579, lng: 19.9457, address: "ul. Józefa Dietla 40–58", district: "Stare Miasto",
      matching_radius_m: 300, assessment: "corroborated", response_status: "triaged", version: 2, support_count: 3, urgent: false,
      review: { reason: "proposal_ready", note: "Decision-maker proposes a ticket for the Electricity Operator.", since: ago(6) },
      report_ids: ["r-311", "r-312", "r-318"],
      evidence: [
        ...evidenceFor(["r-311", "r-312", "r-318"], 6),
        { id: "OBS-7", kind: "observation", label: "Feeder Dietla-3 reports a fault", source: "Electricity Operator telemetry",
          observed_at: ago(33), retrieved_at: ago(6), provenance: "demo", state: "current", note: null },
      ],
      proposal: {
        id: "prop-0142", version: 1, incident_version: 2, institution_id: "demo-electricity", action: "create_service_ticket",
        payload: [
          { key: "Issue", value: "Power outage" },
          { key: "Area", value: "ul. Józefa Dietla 40–58, Stare Miasto" },
          { key: "Since", value: "about 14:00 (earliest report)" },
          { key: "Residents reporting", value: "3 (unverified)" },
          { key: "Evidence", value: "R-311, R-312, R-318, OBS-7" },
        ],
        evidence_ids: ["R-311", "R-312", "R-318", "OBS-7"],
        explanation: "Three residents within 120 m and 8 minutes describe the same outage, and the telemetry feed shows a fault on the feeder that supplies the block. The Electricity Operator is mapped to power outages in Stare Miasto.",
        state: "pending", created_by: AGENT, created_at: ago(6), decided_by: null, decided_at: null, reason: null,
      },
      ticket: null,
      history: [
        event(34, TRIAGE, "Created suspected incident", "From R-311"),
        event(31, TRIAGE, "Linked R-312", "62 m and 3 min from the anchor"),
        event(26, TRIAGE, "Linked R-318", "48 m and 8 min from the anchor"),
        event(6, AGENT, "Proposed ticket v1", "Electricity Operator"),
      ],
      updated_at: ago(6),
    },
    {
      id: "inc-0145", reference: "INC-0145", category_id: "power", issue_type: "exposed_cable",
      title: "Sparking cable box on ul. Starowiślna", lat: 50.05523, lng: 19.94689, address: "ul. Starowiślna 60", district: "Kazimierz",
      matching_radius_m: 300, assessment: "suspected", response_status: "new", version: 1, support_count: 1, urgent: true,
      review: { reason: "urgent", note: "Anyone at risk should call 112. A city ticket does not dispatch emergency services.", since: ago(9) },
      report_ids: ["r-320"],
      evidence: [
        ...evidenceFor(["r-320"], 9),
        { id: "OBS-9", kind: "observation", label: "No telemetry for this cable box", source: "Electricity Operator telemetry",
          observed_at: null, retrieved_at: ago(8), provenance: "demo", state: "missing", note: "Missing is not a zero reading." },
      ],
      proposal: null,
      ticket: null,
      history: [event(9, TRIAGE, "Created suspected incident", "From R-320"), event(9, TRIAGE, "Flagged as urgent", "Danger words: sparks, burning smell")],
      updated_at: ago(9),
    },
    {
      id: "inc-0131", reference: "INC-0131", category_id: "power", issue_type: "street_lighting",
      title: "Street lights out on ul. Miodowa", lat: 50.05196, lng: 19.94848, address: "ul. Miodowa 20–32", district: "Kazimierz",
      matching_radius_m: 300, assessment: "corroborated", response_status: "triaged", version: 4, support_count: 2, urgent: false,
      review: { reason: "ticket_rejected", note: "Electricity Operator: “Street lighting on Miodowa is run by the city road authority, not our network.”", since: ago(40) },
      report_ids: ["r-290", "r-292"],
      evidence: evidenceFor(["r-290", "r-292"], 150),
      proposal: {
        id: "prop-0131", version: 1, incident_version: 3, institution_id: "demo-electricity", action: "create_service_ticket",
        payload: [
          { key: "Issue", value: "Street lighting off" },
          { key: "Area", value: "ul. Miodowa 20–32, Kazimierz" },
          { key: "Residents reporting", value: "2 (unverified)" },
          { key: "Evidence", value: "R-290, R-292" },
        ],
        evidence_ids: ["R-290", "R-292"],
        explanation: "Two reports of dark street lights on one street.",
        state: "executed", created_by: AGENT, created_at: ago(150), decided_by: OFFICIAL, decided_at: ago(140), reason: null,
      },
      ticket: {
        id: "tkt-0131", reference: "ELE-26-0418", institution_id: "demo-electricity", status: "rejected", expected_resolution_at: null,
        events: [
          { status: "created", at: ago(140), note: null },
          { status: "rejected", at: ago(40), note: "Street lighting on Miodowa is run by the city road authority, not our network." },
        ],
      },
      history: [
        event(190, TRIAGE, "Created suspected incident", "From R-290"),
        event(176, TRIAGE, "Linked R-292"),
        event(150, AGENT, "Proposed ticket v1", "Electricity Operator"),
        event(140, OFFICIAL, "Approved proposal v1"),
        event(140, "Executor", "Created ticket ELE-26-0418"),
        event(40, "Electricity Operator", "Rejected ticket", "Not our network"),
      ],
      updated_at: ago(40),
    },
    {
      id: "inc-0139", reference: "INC-0139", category_id: "water", issue_type: "burst_main",
      title: "Burst water main on ul. Bernardyńska", lat: 50.05295, lng: 19.93836, address: "ul. Bernardyńska 2–4", district: "Stare Miasto",
      matching_radius_m: 300, assessment: "verified", response_status: "assigned", version: 5, support_count: 2, urgent: false, review: null,
      report_ids: ["r-301", "r-303"],
      evidence: evidenceFor(["r-301", "r-303"], 50),
      proposal: {
        id: "prop-0139", version: 1, incident_version: 4, institution_id: "demo-water", action: "create_service_ticket",
        payload: [
          { key: "Issue", value: "Burst water main" },
          { key: "Area", value: "ul. Bernardyńska 2–4, Stare Miasto" },
          { key: "Evidence", value: "R-301, R-303" },
        ],
        evidence_ids: ["R-301", "R-303"], explanation: "Two reports of water rising through the road.",
        state: "executed", created_by: AGENT, created_at: ago(52), decided_by: OFFICIAL, decided_at: ago(48), reason: null,
      },
      ticket: {
        id: "tkt-0139", reference: "WAT-26-1022", institution_id: "demo-water", status: "acknowledged", expected_resolution_at: ahead(150),
        events: [
          { status: "created", at: ago(48), note: null },
          { status: "acknowledged", at: ago(30), note: "Crew on the way." },
        ],
      },
      history: [
        event(65, TRIAGE, "Created suspected incident", "From R-301"),
        event(58, TRIAGE, "Linked R-303"),
        event(55, OFFICIAL, "Verified", "Photo from the street camera"),
        event(52, AGENT, "Proposed ticket v1", "Water Services"),
        event(48, OFFICIAL, "Approved proposal v1"),
        event(48, "Executor", "Created ticket WAT-26-1022"),
        event(30, "Water Services", "Acknowledged ticket"),
      ],
      updated_at: ago(30),
    },
    {
      id: "inc-0140", reference: "INC-0140", category_id: "water", issue_type: "low_pressure",
      title: "Low water pressure on ul. Stradomska", lat: 50.05421, lng: 19.94058, address: "ul. Stradomska 11–19", district: "Stare Miasto",
      matching_radius_m: 300, assessment: "suspected", response_status: "in_progress", version: 4, support_count: 1, urgent: false, review: null,
      report_ids: ["r-305"],
      evidence: evidenceFor(["r-305"], 80),
      proposal: {
        id: "prop-0140", version: 1, incident_version: 3, institution_id: "demo-water", action: "create_service_ticket",
        payload: [
          { key: "Issue", value: "Low water pressure" },
          { key: "Area", value: "ul. Stradomska 11–19, Stare Miasto" },
          { key: "Evidence", value: "R-305" },
        ],
        evidence_ids: ["R-305"], explanation: "One report of low pressure in a whole building.",
        state: "executed", created_by: AGENT, created_at: ago(80), decided_by: OFFICIAL, decided_at: ago(75), reason: null,
      },
      ticket: {
        id: "tkt-0140", reference: "WAT-26-1019", institution_id: "demo-water", status: "in_progress", expected_resolution_at: ahead(60),
        events: [
          { status: "created", at: ago(75), note: null },
          { status: "acknowledged", at: ago(62), note: null },
          { status: "in_progress", at: ago(35), note: "Checking the pressure valve at Stradomska." },
        ],
      },
      history: [
        event(88, TRIAGE, "Created suspected incident", "From R-305"),
        event(80, AGENT, "Proposed ticket v1", "Water Services"),
        event(75, OFFICIAL, "Approved proposal v1"),
        event(75, "Executor", "Created ticket WAT-26-1019"),
        event(62, "Water Services", "Acknowledged ticket"),
        event(35, "Water Services", "Started work"),
      ],
      updated_at: ago(35),
    },
    {
      id: "inc-0128", reference: "INC-0128", category_id: "power", issue_type: "power_outage",
      title: "Power outage on Rynek Podgórski", lat: 50.04431, lng: 19.94953, address: "Rynek Podgórski 10–14", district: "Podgórze",
      matching_radius_m: 300, assessment: "verified", response_status: "resolved", version: 6, support_count: 1, urgent: false, review: null,
      report_ids: ["r-271"],
      evidence: evidenceFor(["r-271"], 400),
      proposal: {
        id: "prop-0128", version: 1, incident_version: 3, institution_id: "demo-electricity", action: "create_service_ticket",
        payload: [
          { key: "Issue", value: "Power outage" },
          { key: "Area", value: "Rynek Podgórski 10–14, Podgórze" },
          { key: "Evidence", value: "R-271" },
        ],
        evidence_ids: ["R-271"], explanation: "Report confirmed by telemetry.",
        state: "executed", created_by: AGENT, created_at: ago(400), decided_by: OFFICIAL, decided_at: ago(395), reason: null,
      },
      ticket: {
        id: "tkt-0128", reference: "ELE-26-0409", institution_id: "demo-electricity", status: "resolved", expected_resolution_at: null,
        events: [
          { status: "created", at: ago(395), note: null },
          { status: "acknowledged", at: ago(380), note: null },
          { status: "in_progress", at: ago(350), note: null },
          { status: "resolved", at: ago(70), note: "Cable joint replaced; supply restored." },
        ],
      },
      history: [
        event(420, TRIAGE, "Created suspected incident", "From R-271"),
        event(400, AGENT, "Proposed ticket v1", "Electricity Operator"),
        event(395, OFFICIAL, "Approved proposal v1"),
        event(395, "Executor", "Created ticket ELE-26-0409"),
        event(70, "Electricity Operator", "Resolved ticket", "Cable joint replaced; supply restored."),
      ],
      updated_at: ago(70),
    },
  ];

  return { institutions: INSTITUTIONS, incidents, reports };
}
