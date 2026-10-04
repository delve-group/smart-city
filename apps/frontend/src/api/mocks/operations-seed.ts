/**
 * MOCK DATA for `npm run dev:ui` (see use-mocks.ts). Fictional incidents, reports and institutions at real Kraków streets, written
 * in Polish like real residents' reports. Covers every review-queue case: a ready proposal, an urgent report, an uncertain link,
 * an apartment-only report, failed triage, an institution rejection and finished work, across all eight categories.
 * Times are relative to "now". Institutions are fictional services, not real companies.
 */
import type { HistoryDto, IncidentDto, InstitutionDto, OperationsReportDto, WorkspaceDto } from "@/api/operations/types";

const MINUTE = 60_000;

export const OFFICIAL = "Urzędnik miejski";
export const AGENT = "Agent decyzyjny";
export const TRIAGE = "Automatyczna selekcja";
export const EXECUTOR = "Wysyłka zleceń";

export const INSTITUTIONS: InstitutionDto[] = [
  { id: "demo-electricity", name: "Pogotowie energetyczne", category_ids: ["power"], is_demo: true },
  { id: "demo-water", name: "Służba wodociągowa", category_ids: ["water"], is_demo: true },
  { id: "demo-roads", name: "Zarząd dróg", category_ids: ["roads", "accessibility"], is_demo: true },
  { id: "demo-transit", name: "Przewoźnik komunikacji miejskiej", category_ids: ["transit"], is_demo: true },
  { id: "demo-waste", name: "Służba oczyszczania miasta", category_ids: ["waste"], is_demo: true },
  { id: "demo-greenery", name: "Służba zieleni miejskiej", category_ids: ["greenery"], is_demo: true },
  { id: "demo-air", name: "Służba ochrony środowiska", category_ids: ["air"], is_demo: true },
];

/** Ticket reference prefix per institution, like a real intake system would issue. */
export const TICKET_PREFIX: Record<string, string> = {
  "demo-electricity": "ELE", "demo-water": "WOD", "demo-roads": "DRO", "demo-transit": "KOM",
  "demo-waste": "OCZ", "demo-greenery": "ZIE", "demo-air": "SRO",
};

const institutionName = (id: string) => INSTITUTIONS.find((institution) => institution.id === id)!.name;

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
      summary: "Od około drugiej nie ma prądu w całym budynku. Latarnie na naszym odcinku też nie świecą.",
      lat: 50.05806, lng: 19.94532, address: "ul. Józefa Dietla 44" }),
    report({ id: "r-312", reference: "R-312", channel: "form", category_id: "power", minutesAgo: 31, incident_id: "inc-0142",
      summary: "Sklepy na tym odcinku Dietla są bez prądu. Sygnalizacja na skrzyżowaniu nie działa.",
      lat: 50.05772, lng: 19.94611, address: "ul. Józefa Dietla 52" }),
    report({ id: "r-318", reference: "R-318", channel: "voice", category_id: "power", minutesAgo: 26, incident_id: "inc-0142",
      summary: "Brak prądu u mnie w kamienicy i w tej po drugiej stronie ulicy.", observed_at: null,
      lat: 50.05834, lng: 19.94598, address: "ul. Józefa Dietla 47" }),
    // Apartment-only: stays private until reviewed.
    report({ id: "r-327", reference: "R-327", channel: "voice", category_id: "power", minutesAgo: 12, triage_state: "needs_review",
      summary: "Nie mam prądu tylko w swoim mieszkaniu, sąsiedzi na piętrze mają.", unit: "m. 14",
      lat: 50.05797, lng: 19.94641, address: "ul. Józefa Dietla 54",
      review: { reason: "private_scope", note: "Dotyczy tylko jednego mieszkania. Zostaje prywatne, chyba że należy do awarii na ulicy.", since: ago(12),
        candidates: [{ incident_id: "inc-0142", distance_m: 61, minutes_apart: 22 }] } }),
    // INC-0145: urgent.
    report({ id: "r-320", reference: "R-320", channel: "voice", category_id: "power", minutesAgo: 9, incident_id: "inc-0145",
      summary: "Z szafki kablowej na chodniku lecą iskry i czuć spaleniznę. Ludzie przechodzą tuż obok.",
      lat: 50.05523, lng: 19.94689, address: "ul. Starowiślna 60" }),
    // Uncertain link between two water incidents.
    report({ id: "r-325", reference: "R-325", channel: "form", category_id: "water", minutesAgo: 18, triage_state: "needs_review",
      summary: "Spomiędzy kostki brukowej wybija woda i spływa w stronę przystanku tramwajowego.",
      lat: 50.05356, lng: 19.93961, address: "ul. Stradomska 7",
      review: { reason: "needs_link", note: "W zasięgu dopasowania są dwa aktywne zdarzenia wodne.", since: ago(18),
        candidates: [
          { incident_id: "inc-0139", distance_m: 120, minutes_apart: 47 },
          { incident_id: "inc-0140", distance_m: 112, minutes_apart: 70 },
        ] } }),
    // Triage failed: needs a manual decision.
    report({ id: "r-330", reference: "R-330", channel: "form", category_id: "power", minutesAgo: 5, triage_state: "pending",
      summary: "Światło na klatce schodowej mruga co kilka minut, w całym budynku.",
      lat: 50.05878, lng: 19.94871, address: "ul. Grzegórzecka 9",
      review: { reason: "pending_triage", note: "Nic nie zostało zgrupowane automatycznie. Zdecyduj ręcznie, gdzie należy.", since: ago(5), candidates: [] } }),
    // INC-0131: rejected by the institution.
    report({ id: "r-290", reference: "R-290", channel: "form", category_id: "power", minutesAgo: 190, incident_id: "inc-0131",
      summary: "Po zmroku na Miodowej nie świeci żadna latarnia.", lat: 50.05204, lng: 19.94795, address: "ul. Miodowa 24" }),
    report({ id: "r-292", reference: "R-292", channel: "voice", category_id: "power", minutesAgo: 176, incident_id: "inc-0131",
      summary: "Od synagogi do Starowiślnej ulica jest kompletnie ciemna.", lat: 50.05188, lng: 19.94902, address: "ul. Miodowa 30" }),
    // INC-0139 / INC-0140: assigned to the water service.
    report({ id: "r-301", reference: "R-301", channel: "voice", category_id: "water", minutesAgo: 65, incident_id: "inc-0139",
      summary: "Przy kościele woda wybija z jezdni.", lat: 50.05301, lng: 19.93822, address: "ul. Bernardyńska 2" }),
    report({ id: "r-303", reference: "R-303", channel: "form", category_id: "water", minutesAgo: 58, incident_id: "inc-0139",
      summary: "Na całą szerokość ulicy rośnie kałuża, wygląda na pękniętą rurę.", lat: 50.05289, lng: 19.93851, address: "ul. Bernardyńska 4" }),
    report({ id: "r-305", reference: "R-305", channel: "voice", category_id: "water", minutesAgo: 88, incident_id: "inc-0140",
      summary: "Od rana bardzo słabe ciśnienie wody w całym budynku.", lat: 50.05421, lng: 19.94058, address: "ul. Stradomska 15" }),
    // INC-0128: resolved, ready to close.
    report({ id: "r-271", reference: "R-271", channel: "form", category_id: "power", minutesAgo: 420, incident_id: "inc-0128",
      summary: "Brak prądu po wschodniej stronie rynku.", lat: 50.04431, lng: 19.94953, address: "Rynek Podgórski 12" }),
    // INC-0147: pothole, two residents, proposal ready.
    report({ id: "r-333", reference: "R-333", channel: "form", category_id: "roads", minutesAgo: 95, incident_id: "inc-0147",
      summary: "Głęboka dziura na prawym pasie przed przejściem, samochody gwałtownie hamują.",
      lat: 50.04772, lng: 19.93347, address: "ul. Krakowska 41" }),
    report({ id: "r-336", reference: "R-336", channel: "voice", category_id: "roads", minutesAgo: 70, incident_id: "inc-0147",
      summary: "Wjechałem rowerem w wyrwę w asfalcie przy Krakowskiej, łatwo o wypadek.",
      lat: 50.04751, lng: 19.93362, address: "ul. Krakowska 45" }),
    // INC-0148: tram stop, proposal ready.
    report({ id: "r-338", reference: "R-338", channel: "form", category_id: "transit", minutesAgo: 42, incident_id: "inc-0148",
      summary: "Tablica z odjazdami na przystanku nie działa, a rozkład jest zerwany.",
      lat: 50.06573, lng: 19.95962, address: "Rondo Mogilskie" }),
    // INC-0144: overflowing bins, work in progress.
    report({ id: "r-315", reference: "R-315", channel: "form", category_id: "waste", minutesAgo: 300, incident_id: "inc-0144",
      summary: "Kosze przy placu przepełnione od weekendu, śmieci leżą na chodniku.",
      lat: 50.05141, lng: 19.94478, address: "plac Nowy 4" }),
    report({ id: "r-316", reference: "R-316", channel: "voice", category_id: "waste", minutesAgo: 280, incident_id: "inc-0144",
      summary: "Przy okrąglaku stos worków i rozwiane opakowania, mewy wszystko roznoszą.",
      lat: 50.05156, lng: 19.94452, address: "plac Nowy 7" }),
    // INC-0149: fallen branch, urgent.
    report({ id: "r-340", reference: "R-340", channel: "voice", category_id: "greenery", minutesAgo: 14, incident_id: "inc-0149",
      summary: "Na Plantach spadł duży konar i zablokował alejkę. Drugi wisi nad ławkami.",
      lat: 50.06468, lng: 19.93934, address: "ul. Basztowa 15" }),
    // INC-0137: broken lift, acknowledged.
    report({ id: "r-297", reference: "R-297", channel: "form", category_id: "accessibility", minutesAgo: 260, incident_id: "inc-0137",
      summary: "Winda na peron przy dworcu nie działa, nie da się wjechać wózkiem.",
      lat: 50.06686, lng: 19.94716, address: "ul. Pawia 5" }),
    // INC-0150: night noise, no institution chosen yet.
    report({ id: "r-342", reference: "R-342", channel: "form", category_id: "air", minutesAgo: 22, incident_id: "inc-0150",
      summary: "Od kilku nocy głośna praca agregatu na budowie po 23:00.",
      lat: 50.06041, lng: 19.93571, address: "ul. Szewska 20" }),
    // INC-0126: blocked ramp, resolved.
    report({ id: "r-266", reference: "R-266", channel: "form", category_id: "accessibility", minutesAgo: 1500, incident_id: "inc-0126",
      summary: "Podjazd dla wózków przy przejściu zastawiony przez rusztowanie.",
      lat: 50.06125, lng: 19.94012, address: "ul. Floriańska 30" }),
  ];

  const evidenceFor = (ids: string[], minutesAgo: number) =>
    ids.map((id) => {
      const source = reports.find((candidate) => candidate.id === id)!;
      return {
        id: source.reference,
        kind: "report" as const,
        label: `${source.reference} · zgłoszenie ${source.channel === "voice" ? "głosowe" : "z formularza"}`,
        source: "Zgłoszenie mieszkańca",
        observed_at: source.observed_at,
        retrieved_at: ago(minutesAgo),
        provenance: "demo" as const,
        state: "current" as const,
        note: source.observed_at ? null : "Nieznany czas obserwacji.",
      };
    });

  /** A proposal already sent, with its ticket; the institution's events follow. */
  const sent = (id: string, institutionId: string, payload: { key: string; value: string }[], explanation: string, at: number) => ({
    id: `prop-${id}`, version: 1, incident_version: 3, institution_id: institutionId, action: "create_service_ticket" as const,
    payload, evidence_ids: payload.find((item) => item.key === "Evidence")?.value.split(", ") ?? [], explanation,
    state: "executed" as const, created_by: AGENT, created_at: ago(at + 5), decided_by: OFFICIAL, decided_at: ago(at), reason: null,
  });

  const incidents: IncidentDto[] = [
    {
      id: "inc-0142", reference: "INC-0142", category_id: "power", issue_type: "power_outage",
      title: "Awaria prądu na ul. Józefa Dietla", lat: 50.0579, lng: 19.9457, address: "ul. Józefa Dietla 40–58", district: "Stare Miasto",
      matching_radius_m: 300, assessment: "corroborated", response_status: "triaged", version: 2, support_count: 3, urgent: false,
      review: { reason: "proposal_ready", note: "Agent proponuje zlecenie dla pogotowia energetycznego.", since: ago(6) },
      report_ids: ["r-311", "r-312", "r-318"],
      evidence: [
        ...evidenceFor(["r-311", "r-312", "r-318"], 6),
        { id: "OBS-7", kind: "observation", label: "Zgłoszona usterka na linii zasilającej Dietla-3", source: "Telemetria sieci energetycznej",
          observed_at: ago(33), retrieved_at: ago(6), provenance: "demo", state: "current", note: null },
      ],
      proposal: {
        id: "prop-0142", version: 1, incident_version: 2, institution_id: "demo-electricity", action: "create_service_ticket",
        payload: [
          { key: "Issue", value: "Awaria prądu" },
          { key: "Area", value: "ul. Józefa Dietla 40–58, Stare Miasto" },
          { key: "Since", value: "około 14:00 (najwcześniejsze zgłoszenie)" },
          { key: "Residents reporting", value: "3" },
          { key: "Evidence", value: "R-311, R-312, R-318, OBS-7" },
        ],
        evidence_ids: ["R-311", "R-312", "R-318", "OBS-7"],
        explanation: "Trzech mieszkańców w promieniu 120 m i w ciągu 8 minut opisuje tę samą awarię, a telemetria pokazuje usterkę na linii zasilającej kwartał. Pogotowie energetyczne odpowiada za awarie prądu na Starym Mieście.",
        state: "pending", created_by: AGENT, created_at: ago(6), decided_by: null, decided_at: null, reason: null,
      },
      ticket: null,
      history: [
        event(34, TRIAGE, "Utworzono zdarzenie podejrzewane", "Z R-311"),
        event(31, TRIAGE, "Powiązano R-312", "62 m i 3 min od pierwszego zgłoszenia"),
        event(26, TRIAGE, "Powiązano R-318", "48 m i 8 min od pierwszego zgłoszenia"),
        event(6, AGENT, "Zaproponowano zlecenie v1", institutionName("demo-electricity")),
      ],
      updated_at: ago(6),
    },
    {
      id: "inc-0145", reference: "INC-0145", category_id: "power", issue_type: "exposed_cable",
      title: "Iskrząca szafka kablowa na ul. Starowiślnej", lat: 50.05523, lng: 19.94689, address: "ul. Starowiślna 60", district: "Kazimierz",
      matching_radius_m: 300, assessment: "suspected", response_status: "new", version: 1, support_count: 1, urgent: true,
      review: { reason: "urgent", note: "Jeśli komuś grozi niebezpieczeństwo, dzwoń pod 112. Zlecenie miejskie nie wysyła służb ratunkowych.", since: ago(9) },
      report_ids: ["r-320"],
      evidence: [
        ...evidenceFor(["r-320"], 9),
        { id: "OBS-9", kind: "observation", label: "Brak telemetrii dla tej szafki", source: "Telemetria sieci energetycznej",
          observed_at: null, retrieved_at: ago(8), provenance: "demo", state: "missing", note: "Brak odczytu to nie odczyt zerowy." },
      ],
      proposal: null,
      ticket: null,
      history: [event(9, TRIAGE, "Utworzono zdarzenie podejrzewane", "Z R-320"), event(9, TRIAGE, "Oznaczono jako pilne", "Słowa alarmowe: iskry, spalenizna")],
      updated_at: ago(9),
    },
    {
      id: "inc-0131", reference: "INC-0131", category_id: "power", issue_type: "street_light_fault",
      title: "Niedziałające latarnie na ul. Miodowej", lat: 50.05196, lng: 19.94848, address: "ul. Miodowa 20–32", district: "Kazimierz",
      matching_radius_m: 300, assessment: "corroborated", response_status: "triaged", version: 4, support_count: 2, urgent: false,
      review: { reason: "ticket_rejected", note: "Pogotowie energetyczne: „Oświetleniem ulicznym na Miodowej zarządza zarząd dróg, nie nasza sieć”.", since: ago(40) },
      report_ids: ["r-290", "r-292"],
      evidence: evidenceFor(["r-290", "r-292"], 150),
      proposal: {
        id: "prop-0131", version: 1, incident_version: 3, institution_id: "demo-electricity", action: "create_service_ticket",
        payload: [
          { key: "Issue", value: "Niedziałające oświetlenie uliczne" },
          { key: "Area", value: "ul. Miodowa 20–32, Kazimierz" },
          { key: "Residents reporting", value: "2" },
          { key: "Evidence", value: "R-290, R-292" },
        ],
        evidence_ids: ["R-290", "R-292"],
        explanation: "Dwa zgłoszenia niedziałających latarni na jednej ulicy.",
        state: "executed", created_by: AGENT, created_at: ago(150), decided_by: OFFICIAL, decided_at: ago(140), reason: null,
      },
      ticket: {
        id: "tkt-0131", reference: "ELE-26-0418", institution_id: "demo-electricity", status: "rejected", expected_resolution_at: null,
        events: [
          { status: "created", at: ago(140), note: null },
          { status: "rejected", at: ago(40), note: "Oświetleniem ulicznym na Miodowej zarządza zarząd dróg, nie nasza sieć." },
        ],
      },
      history: [
        event(190, TRIAGE, "Utworzono zdarzenie podejrzewane", "Z R-290"),
        event(176, TRIAGE, "Powiązano R-292"),
        event(150, AGENT, "Zaproponowano zlecenie v1", institutionName("demo-electricity")),
        event(140, OFFICIAL, "Zatwierdzono propozycję v1"),
        event(140, EXECUTOR, "Utworzono zlecenie ELE-26-0418"),
        event(40, institutionName("demo-electricity"), "Odrzucono zlecenie", "To nie nasza sieć"),
      ],
      updated_at: ago(40),
    },
    {
      id: "inc-0139", reference: "INC-0139", category_id: "water", issue_type: "burst_pipe",
      title: "Pęknięta magistrala wodna na ul. Bernardyńskiej", lat: 50.05295, lng: 19.93836, address: "ul. Bernardyńska 2–4", district: "Stare Miasto",
      matching_radius_m: 300, assessment: "verified", response_status: "assigned", version: 5, support_count: 2, urgent: false, review: null,
      report_ids: ["r-301", "r-303"],
      evidence: evidenceFor(["r-301", "r-303"], 50),
      proposal: sent("0139", "demo-water", [
        { key: "Issue", value: "Pęknięta magistrala wodna" },
        { key: "Area", value: "ul. Bernardyńska 2–4, Stare Miasto" },
        { key: "Evidence", value: "R-301, R-303" },
      ], "Dwa zgłoszenia wody wybijającej z jezdni.", 48),
      ticket: {
        id: "tkt-0139", reference: "WOD-26-1022", institution_id: "demo-water", status: "acknowledged", expected_resolution_at: ahead(150),
        events: [
          { status: "created", at: ago(48), note: null },
          { status: "acknowledged", at: ago(30), note: "Ekipa w drodze." },
        ],
      },
      history: [
        event(65, TRIAGE, "Utworzono zdarzenie podejrzewane", "Z R-301"),
        event(58, TRIAGE, "Powiązano R-303"),
        event(55, OFFICIAL, "Zweryfikowano", "Zdjęcie z kamery miejskiej"),
        event(52, AGENT, "Zaproponowano zlecenie v1", institutionName("demo-water")),
        event(48, OFFICIAL, "Zatwierdzono propozycję v1"),
        event(48, EXECUTOR, "Utworzono zlecenie WOD-26-1022"),
        event(30, institutionName("demo-water"), "Przyjęto zlecenie"),
      ],
      updated_at: ago(30),
    },
    {
      id: "inc-0140", reference: "INC-0140", category_id: "water", issue_type: "water_outage",
      title: "Niskie ciśnienie wody na ul. Stradomskiej", lat: 50.05421, lng: 19.94058, address: "ul. Stradomska 11–19", district: "Stare Miasto",
      matching_radius_m: 300, assessment: "suspected", response_status: "in_progress", version: 4, support_count: 1, urgent: false, review: null,
      report_ids: ["r-305"],
      evidence: evidenceFor(["r-305"], 80),
      proposal: sent("0140", "demo-water", [
        { key: "Issue", value: "Niskie ciśnienie wody" },
        { key: "Area", value: "ul. Stradomska 11–19, Stare Miasto" },
        { key: "Evidence", value: "R-305" },
      ], "Jedno zgłoszenie niskiego ciśnienia w całym budynku.", 75),
      ticket: {
        id: "tkt-0140", reference: "WOD-26-1019", institution_id: "demo-water", status: "in_progress", expected_resolution_at: ahead(60),
        events: [
          { status: "created", at: ago(75), note: null },
          { status: "acknowledged", at: ago(62), note: null },
          { status: "in_progress", at: ago(35), note: "Sprawdzamy zawór redukcyjny na Stradomskiej." },
        ],
      },
      history: [
        event(88, TRIAGE, "Utworzono zdarzenie podejrzewane", "Z R-305"),
        event(80, AGENT, "Zaproponowano zlecenie v1", institutionName("demo-water")),
        event(75, OFFICIAL, "Zatwierdzono propozycję v1"),
        event(75, EXECUTOR, "Utworzono zlecenie WOD-26-1019"),
        event(62, institutionName("demo-water"), "Przyjęto zlecenie"),
        event(35, institutionName("demo-water"), "Rozpoczęto prace"),
      ],
      updated_at: ago(35),
    },
    {
      id: "inc-0128", reference: "INC-0128", category_id: "power", issue_type: "power_outage",
      title: "Awaria prądu na Rynku Podgórskim", lat: 50.04431, lng: 19.94953, address: "Rynek Podgórski 10–14", district: "Podgórze",
      matching_radius_m: 300, assessment: "verified", response_status: "resolved", version: 6, support_count: 1, urgent: false, review: null,
      report_ids: ["r-271"],
      evidence: evidenceFor(["r-271"], 400),
      proposal: sent("0128", "demo-electricity", [
        { key: "Issue", value: "Awaria prądu" },
        { key: "Area", value: "Rynek Podgórski 10–14, Podgórze" },
        { key: "Evidence", value: "R-271" },
      ], "Zgłoszenie potwierdzone przez telemetrię.", 395),
      ticket: {
        id: "tkt-0128", reference: "ELE-26-0409", institution_id: "demo-electricity", status: "resolved", expected_resolution_at: null,
        events: [
          { status: "created", at: ago(395), note: null },
          { status: "acknowledged", at: ago(380), note: null },
          { status: "in_progress", at: ago(350), note: null },
          { status: "resolved", at: ago(70), note: "Wymieniono mufę kablową, zasilanie przywrócone." },
        ],
      },
      history: [
        event(420, TRIAGE, "Utworzono zdarzenie podejrzewane", "Z R-271"),
        event(400, AGENT, "Zaproponowano zlecenie v1", institutionName("demo-electricity")),
        event(395, OFFICIAL, "Zatwierdzono propozycję v1"),
        event(395, EXECUTOR, "Utworzono zlecenie ELE-26-0409"),
        event(70, institutionName("demo-electricity"), "Rozwiązano zlecenie", "Wymieniono mufę kablową, zasilanie przywrócone."),
      ],
      updated_at: ago(70),
    },
    {
      id: "inc-0147", reference: "INC-0147", category_id: "roads", issue_type: "pothole",
      title: "Dziura w jezdni na ul. Krakowskiej", lat: 50.04762, lng: 19.93354, address: "ul. Krakowska 41–45", district: "Kazimierz",
      matching_radius_m: 300, assessment: "corroborated", response_status: "triaged", version: 2, support_count: 2, urgent: false,
      review: { reason: "proposal_ready", note: "Agent proponuje zlecenie dla zarządu dróg.", since: ago(20) },
      report_ids: ["r-333", "r-336"],
      evidence: evidenceFor(["r-333", "r-336"], 20),
      proposal: {
        id: "prop-0147", version: 1, incident_version: 2, institution_id: "demo-roads", action: "create_service_ticket",
        payload: [
          { key: "Issue", value: "Dziura w jezdni" },
          { key: "Area", value: "ul. Krakowska 41–45, Kazimierz" },
          { key: "Residents reporting", value: "2" },
          { key: "Evidence", value: "R-333, R-336" },
        ],
        evidence_ids: ["R-333", "R-336"],
        explanation: "Dwa zgłoszenia tej samej wyrwy przed przejściem dla pieszych, w tym rowerzysty. Zarząd dróg odpowiada za nawierzchnię.",
        state: "pending", created_by: AGENT, created_at: ago(20), decided_by: null, decided_at: null, reason: null,
      },
      ticket: null,
      history: [
        event(95, TRIAGE, "Utworzono zdarzenie podejrzewane", "Z R-333"),
        event(70, TRIAGE, "Powiązano R-336", "27 m i 25 min od pierwszego zgłoszenia"),
        event(20, AGENT, "Zaproponowano zlecenie v1", institutionName("demo-roads")),
      ],
      updated_at: ago(20),
    },
    {
      id: "inc-0148", reference: "INC-0148", category_id: "transit", issue_type: "transit_disruption",
      title: "Awaria tablicy odjazdów na przystanku Rondo Mogilskie", lat: 50.06573, lng: 19.95962, address: "Rondo Mogilskie", district: "Grzegórzki",
      matching_radius_m: 300, assessment: "suspected", response_status: "triaged", version: 2, support_count: 1, urgent: false,
      review: { reason: "proposal_ready", note: "Agent proponuje zlecenie dla przewoźnika.", since: ago(38) },
      report_ids: ["r-338"],
      evidence: evidenceFor(["r-338"], 38),
      proposal: {
        id: "prop-0148", version: 1, incident_version: 2, institution_id: "demo-transit", action: "create_service_ticket",
        payload: [
          { key: "Issue", value: "Niedziałająca tablica odjazdów i zerwany rozkład" },
          { key: "Area", value: "Rondo Mogilskie, Grzegórzki" },
          { key: "Residents reporting", value: "1" },
          { key: "Evidence", value: "R-338" },
        ],
        evidence_ids: ["R-338"],
        explanation: "Jedno zgłoszenie z przystanku. Przewoźnik odpowiada za wyposażenie przystanków.",
        state: "pending", created_by: AGENT, created_at: ago(38), decided_by: null, decided_at: null, reason: null,
      },
      ticket: null,
      history: [
        event(42, TRIAGE, "Utworzono zdarzenie podejrzewane", "Z R-338"),
        event(38, AGENT, "Zaproponowano zlecenie v1", institutionName("demo-transit")),
      ],
      updated_at: ago(38),
    },
    {
      id: "inc-0144", reference: "INC-0144", category_id: "waste", issue_type: "overflowing_bin",
      title: "Przepełnione kosze na placu Nowym", lat: 50.05148, lng: 19.94465, address: "plac Nowy 4–7", district: "Kazimierz",
      matching_radius_m: 300, assessment: "corroborated", response_status: "in_progress", version: 5, support_count: 2, urgent: false, review: null,
      report_ids: ["r-315", "r-316"],
      evidence: evidenceFor(["r-315", "r-316"], 270),
      proposal: sent("0144", "demo-waste", [
        { key: "Issue", value: "Przepełnione kosze i śmieci na chodniku" },
        { key: "Area", value: "plac Nowy 4–7, Kazimierz" },
        { key: "Residents reporting", value: "2" },
        { key: "Evidence", value: "R-315, R-316" },
      ], "Dwa zgłoszenia przepełnionych koszy przy okrąglaku.", 265),
      ticket: {
        id: "tkt-0144", reference: "OCZ-26-0233", institution_id: "demo-waste", status: "in_progress", expected_resolution_at: ahead(90),
        events: [
          { status: "created", at: ago(265), note: null },
          { status: "acknowledged", at: ago(240), note: null },
          { status: "in_progress", at: ago(60), note: "Dodatkowy odbiór zaplanowany na dziś." },
        ],
      },
      history: [
        event(300, TRIAGE, "Utworzono zdarzenie podejrzewane", "Z R-315"),
        event(280, TRIAGE, "Powiązano R-316"),
        event(270, AGENT, "Zaproponowano zlecenie v1", institutionName("demo-waste")),
        event(265, OFFICIAL, "Zatwierdzono propozycję v1"),
        event(265, EXECUTOR, "Utworzono zlecenie OCZ-26-0233"),
        event(240, institutionName("demo-waste"), "Przyjęto zlecenie"),
        event(60, institutionName("demo-waste"), "Rozpoczęto prace", "Dodatkowy odbiór zaplanowany na dziś."),
      ],
      updated_at: ago(60),
    },
    {
      id: "inc-0149", reference: "INC-0149", category_id: "greenery", issue_type: "fallen_tree",
      title: "Złamany konar na Plantach przy ul. Basztowej", lat: 50.06468, lng: 19.93934, address: "ul. Basztowa 15", district: "Stare Miasto",
      matching_radius_m: 300, assessment: "suspected", response_status: "new", version: 1, support_count: 1, urgent: true,
      review: { reason: "urgent", note: "Wiszący konar nad ławkami może spaść. Jeśli komuś grozi niebezpieczeństwo, dzwoń pod 112.", since: ago(14) },
      report_ids: ["r-340"],
      evidence: evidenceFor(["r-340"], 14),
      proposal: null,
      ticket: null,
      history: [event(14, TRIAGE, "Utworzono zdarzenie podejrzewane", "Z R-340"), event(14, TRIAGE, "Oznaczono jako pilne", "Słowa alarmowe: wisi nad ławkami")],
      updated_at: ago(14),
    },
    {
      id: "inc-0137", reference: "INC-0137", category_id: "accessibility", issue_type: "broken_lift",
      title: "Niedziałająca winda na perony przy ul. Pawiej", lat: 50.06686, lng: 19.94716, address: "ul. Pawia 5", district: "Stare Miasto",
      matching_radius_m: 300, assessment: "verified", response_status: "assigned", version: 5, support_count: 1, urgent: false, review: null,
      report_ids: ["r-297"],
      evidence: evidenceFor(["r-297"], 240),
      proposal: sent("0137", "demo-roads", [
        { key: "Issue", value: "Niedziałająca winda dla osób z niepełnosprawnościami" },
        { key: "Area", value: "ul. Pawia 5, Stare Miasto" },
        { key: "Evidence", value: "R-297" },
      ], "Winda to jedyny bezprogowy dostęp do peronu.", 235),
      ticket: {
        id: "tkt-0137", reference: "DRO-26-0577", institution_id: "demo-roads", status: "acknowledged", expected_resolution_at: ahead(1440),
        events: [
          { status: "created", at: ago(235), note: null },
          { status: "acknowledged", at: ago(180), note: "Serwis windy zamówiony na jutro rano." },
        ],
      },
      history: [
        event(260, TRIAGE, "Utworzono zdarzenie podejrzewane", "Z R-297"),
        event(250, OFFICIAL, "Zweryfikowano", "Potwierdzone przez dyżurnego dworca"),
        event(240, AGENT, "Zaproponowano zlecenie v1", institutionName("demo-roads")),
        event(235, OFFICIAL, "Zatwierdzono propozycję v1"),
        event(235, EXECUTOR, "Utworzono zlecenie DRO-26-0577"),
        event(180, institutionName("demo-roads"), "Przyjęto zlecenie", "Serwis windy zamówiony na jutro rano."),
      ],
      updated_at: ago(180),
    },
    {
      id: "inc-0150", reference: "INC-0150", category_id: "air", issue_type: "noise",
      title: "Nocny hałas z budowy na ul. Szewskiej", lat: 50.06041, lng: 19.93571, address: "ul. Szewska 20", district: "Stare Miasto",
      matching_radius_m: 300, assessment: "suspected", response_status: "triaged", version: 1, support_count: 1, urgent: false,
      review: { reason: "needs_responsibility", note: "Hałas z prywatnej budowy może nie podlegać żadnej służbie. Wybierz, kto ma odpowiedzieć.", since: ago(22) },
      report_ids: ["r-342"],
      evidence: evidenceFor(["r-342"], 22),
      proposal: null,
      ticket: null,
      history: [event(22, TRIAGE, "Utworzono zdarzenie podejrzewane", "Z R-342")],
      updated_at: ago(22),
    },
    {
      id: "inc-0126", reference: "INC-0126", category_id: "accessibility", issue_type: "blocked_access",
      title: "Zastawiony podjazd na ul. Floriańskiej", lat: 50.06125, lng: 19.94012, address: "ul. Floriańska 30", district: "Stare Miasto",
      matching_radius_m: 300, assessment: "verified", response_status: "closed", version: 7, support_count: 1, urgent: false, review: null,
      report_ids: ["r-266"],
      evidence: evidenceFor(["r-266"], 1480),
      proposal: sent("0126", "demo-roads", [
        { key: "Issue", value: "Zastawiony podjazd dla wózków" },
        { key: "Area", value: "ul. Floriańska 30, Stare Miasto" },
        { key: "Evidence", value: "R-266" },
      ], "Rusztowanie blokuje jedyny podjazd przy przejściu.", 1470),
      ticket: {
        id: "tkt-0126", reference: "DRO-26-0561", institution_id: "demo-roads", status: "resolved", expected_resolution_at: null,
        events: [
          { status: "created", at: ago(1470), note: null },
          { status: "acknowledged", at: ago(1400), note: null },
          { status: "resolved", at: ago(900), note: "Wykonawca przesunął rusztowanie, podjazd wolny." },
        ],
      },
      history: [
        event(1500, TRIAGE, "Utworzono zdarzenie podejrzewane", "Z R-266"),
        event(1475, AGENT, "Zaproponowano zlecenie v1", institutionName("demo-roads")),
        event(1470, OFFICIAL, "Zatwierdzono propozycję v1"),
        event(1470, EXECUTOR, "Utworzono zlecenie DRO-26-0561"),
        event(900, institutionName("demo-roads"), "Rozwiązano zlecenie", "Wykonawca przesunął rusztowanie, podjazd wolny."),
        event(840, OFFICIAL, "Zamknięto"),
      ],
      updated_at: ago(840),
    },
  ];

  return { institutions: INSTITUTIONS, incidents, reports };
}
