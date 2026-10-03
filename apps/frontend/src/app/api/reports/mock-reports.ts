/**
 * DEMO DATA. Fictional resident reports and city notices at real Kraków locations
 * (coordinates from OpenStreetMap via Photon). Times are relative to "now" so the map
 * always looks current. Responsible services are generic roles, not real companies.
 */
import type { ReportDto, ReportSeverity, ReportStatus } from "@/api/reports/types";

type Location = { key: string; address: string; district: string; lat: number; lng: number };

const LOCATIONS = [
  { key: "florianska", address: "ul. Floriańska", district: "Stare Miasto", lat: 50.06505, lng: 19.94143 },
  { key: "grodzka", address: "ul. Grodzka", district: "Stare Miasto", lat: 50.05863, lng: 19.93793 },
  { key: "matejki", address: "Plac Jana Matejki", district: "Stare Miasto", lat: 50.06655, lng: 19.94224 },
  { key: "karmelicka", address: "ul. Karmelicka", district: "Stare Miasto", lat: 50.0649, lng: 19.93148 },
  { key: "dluga", address: "ul. Długa", district: "Stare Miasto", lat: 50.06692, lng: 19.93888 },
  { key: "mogilskie", address: "Rondo Mogilskie", district: "Grzegórzki", lat: 50.06662, lng: 19.95946 },
  { key: "glowny", address: "Kraków Główny station", district: "Stare Miasto", lat: 50.06842, lng: 19.94789 },
  { key: "opera", address: "ul. Lubicz, by the Opera", district: "Grzegórzki", lat: 50.06593, lng: 19.95619 },
  { key: "plac-nowy", address: "Plac Nowy", district: "Kazimierz", lat: 50.05174, lng: 19.94462 },
  { key: "dietla", address: "ul. Józefa Dietla", district: "Stare Miasto", lat: 50.05812, lng: 19.94649 },
  { key: "rynek-podgorski", address: "Rynek Podgórski", district: "Podgórze", lat: 50.04422, lng: 19.94921 },
  { key: "kalwaryjska", address: "ul. Kalwaryjska", district: "Podgórze", lat: 50.04359, lng: 19.94665 },
  { key: "grunwaldzkie", address: "Rondo Grunwaldzkie", district: "Dębniki", lat: 50.04918, lng: 19.93252 },
  { key: "lagiewniki", address: "Kraków Łagiewniki station", district: "Łagiewniki-Borek Fałęcki", lat: 50.02309, lng: 19.93374 },
  { key: "kobierzynska", address: "ul. Kobierzyńska", district: "Podgórze", lat: 50.03601, lng: 19.93003 },
  { key: "lojasiewicza", address: "ul. Łojasiewicza", district: "Dębniki", lat: 50.02958, lng: 19.90752 },
  { key: "mlynowka", address: "Młynówka Królewska park", district: "Bronowice", lat: 50.07778, lng: 19.87746 },
  { key: "plac-centralny", address: "Plac Centralny", district: "Nowa Huta", lat: 50.07146, lng: 20.03781 },
  { key: "aleja-roz", address: "Aleja Róż", district: "Nowa Huta", lat: 50.07684, lng: 20.03888 },
  { key: "kocmyrzowska", address: "ul. Kocmyrzowska", district: "Bieńczyce", lat: 50.08504, lng: 20.0381 },
  { key: "lema", address: "ul. Stanisława Lema", district: "Czyżyny", lat: 50.06772, lng: 19.99155 },
  { key: "czyzynskie", address: "Rondo Czyżyńskie", district: "Nowa Huta", lat: 50.07353, lng: 20.01697 },
  { key: "kurczaba", address: "Dolina Kurczaba park", district: "Bieżanów-Prokocim", lat: 50.01282, lng: 20.00492 },
  { key: "lipowa", address: "ul. Lipowa", district: "Podgórze", lat: 50.04788, lng: 19.96137 },
  { key: "grzegorzecka", address: "ul. Grzegórzecka", district: "Grzegórzki", lat: 50.05878, lng: 19.94871 },
  { key: "opolska", address: "ul. Opolska", district: "Prądnik Czerwony", lat: 50.08651, lng: 19.9537 },
  { key: "dobrego-pasterza", address: "ul. Dobrego Pasterza", district: "Prądnik Czerwony", lat: 50.08965, lng: 19.9784 },
  { key: "bonarka", address: "Kraków Bonarka station", district: "Podgórze", lat: 50.02984, lng: 19.94647 },
  { key: "jadwigi", address: "ul. Królowej Jadwigi", district: "Zwierzyniec", lat: 50.05608, lng: 19.90406 },
  { key: "salwator", address: "Salwator", district: "Zwierzyniec", lat: 50.05284, lng: 19.91297 },
  { key: "blonia", address: "Błonia", district: "Zwierzyniec", lat: 50.05967, lng: 19.91144 },
  { key: "jordan", address: "Jordan Park", district: "Krowodrza", lat: 50.06273, lng: 19.91607 },
  { key: "zakrzowek", address: "Zakrzówek", district: "Dębniki", lat: 50.04141, lng: 19.91833 },
  { key: "matecznego", address: "Rondo Matecznego", district: "Podgórze", lat: 50.03666, lng: 19.9407 },
  { key: "wielicka", address: "ul. Wielicka", district: "Bieżanów-Prokocim", lat: 50.00583, lng: 20.01822 },
  { key: "mazowiecka", address: "ul. Mazowiecka", district: "Krowodrza", lat: 50.0728, lng: 19.93099 },
  { key: "katynia", address: "Rondo Ofiar Katynia", district: "Bronowice", lat: 50.0872, lng: 19.89151 },
  { key: "bulwarowa", address: "ul. Bulwarowa", district: "Nowa Huta", lat: 50.08055, lng: 20.04852 },
  { key: "lotnikow", address: "Park Lotników Polskich", district: "Czyżyny", lat: 50.06954, lng: 19.99371 },
  { key: "teatralne", address: "Osiedle Teatralne", district: "Nowa Huta", lat: 50.07957, lng: 20.03189 },
  { key: "szpitalna", address: "ul. Szpitalna", district: "Stare Miasto", lat: 50.0627, lng: 19.94118 },] as const satisfies readonly Location[];

type LocationKey = (typeof LOCATIONS)[number]["key"];

type Template = {
  categoryId: string;
  title: string;
  description: string;
  severity: ReportSeverity;
  responsible: string;
  affected?: string;
  /** Typical time to fix once work starts, in hours. */
  fixHours: [number, number];
};

const SERVICE = {
  power: "Power distribution operator",
  lighting: "Municipal Roads Authority — street lighting",
  water: "Municipal Water Company",
  roads: "Municipal Roads Authority",
  transit: "Municipal Transport Company",
  waste: "Municipal Cleaning Company",
  greenery: "City Greenery Board",
  guard: "City Guard — eco patrol",
  rail: "Railway station operator",
};

/** Everyday problems scattered around the city. */
const BACKGROUND: Template[] = [
  { categoryId: "power", title: "Street light out", description: "The street light has been dark for several nights. The pavement is unlit after 17:00.", severity: "low", responsible: SERVICE.lighting, fixHours: [24, 72] },
  { categoryId: "power", title: "Flickering street lights", description: "Several lamps along the street flicker on and off all night.", severity: "low", responsible: SERVICE.lighting, fixHours: [24, 72] },
  { categoryId: "power", title: "Lamp post hatch open, cables exposed", description: "The service hatch at the base of a lamp post is missing and live cables are visible at child height.", severity: "high", responsible: SERVICE.lighting, fixHours: [2, 8] },
  { categoryId: "water", title: "Leaking hydrant", description: "Water is running from a hydrant into the gutter, steadily for hours.", severity: "medium", responsible: SERVICE.water, fixHours: [4, 24] },
  { categoryId: "water", title: "Blocked storm drain", description: "The drain is clogged with leaves; a large puddle forms across the crossing every time it rains.", severity: "medium", responsible: SERVICE.water, fixHours: [12, 48] },
  { categoryId: "roads", title: "Deep pothole", description: "A deep pothole in the right-hand lane. Cars swerve to avoid it and cyclists can fall.", severity: "medium", responsible: SERVICE.roads, fixHours: [24, 96] },
  { categoryId: "roads", title: "Traffic lights not working", description: "The lights at the pedestrian crossing are dark. Drivers do not stop for people waiting.", severity: "high", responsible: SERVICE.roads, fixHours: [2, 6] },
  { categoryId: "roads", title: "Missing manhole cover", description: "An open manhole near the kerb, marked only with a branch stuck in it.", severity: "high", responsible: SERVICE.water, fixHours: [1, 4] },
  { categoryId: "roads", title: "Faded zebra crossing", description: "The crossing markings are almost invisible, especially at night and in the rain.", severity: "low", responsible: SERVICE.roads, fixHours: [72, 240] },
  { categoryId: "transit", title: "Ticket machine out of order", description: "The machine at the stop shows an error and does not accept cards or cash.", severity: "low", responsible: SERVICE.transit, fixHours: [12, 48] },
  { categoryId: "transit", title: "Bus shelter glass smashed", description: "Broken glass from the shelter panel is lying on the platform.", severity: "medium", responsible: SERVICE.transit, fixHours: [6, 24] },
  { categoryId: "transit", title: "Departure board blank", description: "The live departures display at the stop has been blank since this morning.", severity: "low", responsible: SERVICE.transit, fixHours: [24, 72] },
  { categoryId: "waste", title: "Overflowing bins", description: "Bins by the entrance are full and rubbish is piling up on the pavement.", severity: "low", responsible: SERVICE.waste, fixHours: [6, 24] },
  { categoryId: "waste", title: "Illegal dumping", description: "Old furniture and building waste dumped next to the recycling containers.", severity: "medium", responsible: SERVICE.waste, fixHours: [24, 72] },
  { categoryId: "waste", title: "Missed waste collection", description: "Mixed waste was not collected on the scheduled day for the whole street.", severity: "low", responsible: SERVICE.waste, fixHours: [12, 36] },
  { categoryId: "accessibility", title: "Kerb ramp blocked by parked cars", description: "Cars park across the lowered kerb, so wheelchairs and prams cannot cross here.", severity: "medium", responsible: SERVICE.roads, fixHours: [2, 12] },
  { categoryId: "accessibility", title: "Uneven pavement — trip hazard", description: "Raised paving slabs by the crossing; an older resident fell here last week.", severity: "medium", responsible: SERVICE.roads, fixHours: [48, 168] },
  { categoryId: "accessibility", title: "Tactile paving damaged", description: "The tactile strip at the tram stop edge is broken and partly missing.", severity: "medium", responsible: SERVICE.transit, fixHours: [48, 168] },
  { categoryId: "greenery", title: "Fallen branch on the path", description: "A large branch came down in the wind and blocks the footpath.", severity: "medium", responsible: SERVICE.greenery, fixHours: [4, 24] },
  { categoryId: "greenery", title: "Broken playground swing", description: "A swing chain snapped; the seat hangs at an angle. Children still use it.", severity: "medium", responsible: SERVICE.greenery, fixHours: [24, 96] },
  { categoryId: "greenery", title: "Damaged bench", description: "Two slats are broken and the bench is unusable.", severity: "low", responsible: SERVICE.greenery, fixHours: [72, 240] },
  { categoryId: "air", title: "Smoke from illegal burning", description: "Thick, dark smoke from a chimney with a strong smell of burning plastic. Kraków bans solid-fuel heating.", severity: "medium", responsible: SERVICE.guard, fixHours: [1, 6] },
  { categoryId: "air", title: "Construction noise at night", description: "Heavy machinery working on a building site after 22:00.", severity: "low", responsible: SERVICE.guard, fixHours: [2, 12] },
];

type Scenario = Omit<Template, "fixHours"> & {
  at: LocationKey;
  /** Distance from the location point, so pins in one scenario do not overlap. */
  offsetMeters?: [number, number];
  status: ReportStatus;
  source: "resident" | "city";
  minutesAgo: number;
  confirmations: number;
  fixInHours?: number;
};

/** Connected stories a jury can explore: one problem rippling through a neighbourhood. */
const SCENARIOS: Scenario[] = [
  // Prądnik Czerwony: an unplanned power outage takes out homes, street lights and traffic lights.
  { at: "dobrego-pasterza", categoryId: "power", title: "Unplanned power outage", description: "A medium-voltage cable failure cut power to several blocks. Repair crews are on site.", severity: "high", responsible: SERVICE.power, affected: "about 1,200 households", status: "in_progress", source: "city", minutesAgo: 95, confirmations: 64, fixInHours: 3 },
  { at: "dobrego-pasterza", offsetMeters: [120, -80], categoryId: "power", title: "No power in our building", description: "The whole building has been without electricity since the morning. The lift is stuck on the 4th floor.", severity: "high", responsible: SERVICE.power, status: "confirmed", source: "resident", minutesAgo: 110, confirmations: 18 },
  { at: "dobrego-pasterza", offsetMeters: [-150, 60], categoryId: "power", title: "Street lights off on the whole street", description: "No street lighting at all; it is completely dark on the way from the tram stop.", severity: "medium", responsible: SERVICE.lighting, status: "confirmed", source: "resident", minutesAgo: 80, confirmations: 9 },
  { at: "dobrego-pasterza", offsetMeters: [40, 210], categoryId: "roads", title: "Traffic lights dark at the junction", description: "All signals at the junction are off after the outage. Traffic is chaotic at rush hour.", severity: "high", responsible: SERVICE.roads, status: "in_progress", source: "resident", minutesAgo: 70, confirmations: 23, fixInHours: 2 },
  { at: "opolska", offsetMeters: [60, 40], categoryId: "power", title: "Power keeps cutting out", description: "Short power cuts every few minutes; electronics keep restarting.", severity: "medium", responsible: SERVICE.power, status: "reported", source: "resident", minutesAgo: 35, confirmations: 4 },
  // Grzegórzki: a burst water main floods the street and diverts trams.
  { at: "grzegorzecka", categoryId: "water", title: "Burst water main — street flooded", description: "Water is gushing from the road surface. The street is flooded and the water supply is switched off for repairs.", severity: "high", responsible: SERVICE.water, affected: "about 30 buildings without water", status: "in_progress", source: "city", minutesAgo: 240, confirmations: 41, fixInHours: 6 },
  { at: "grzegorzecka", offsetMeters: [-90, 110], categoryId: "water", title: "No water in the building", description: "Taps are dry since this morning. Is there a water tanker nearby?", severity: "medium", responsible: SERVICE.water, status: "confirmed", source: "resident", minutesAgo: 200, confirmations: 12 },
  { at: "grzegorzecka", offsetMeters: [150, -60], categoryId: "transit", title: "Trams diverted from Grzegórzecka", description: "Trams on this section are diverted because of the flooding. Replacement buses run every 10 minutes.", severity: "medium", responsible: SERVICE.transit, status: "in_progress", source: "city", minutesAgo: 220, confirmations: 7, fixInHours: 8 },
  { at: "grzegorzecka", offsetMeters: [60, -170], categoryId: "accessibility", title: "Flooded underpass", description: "The pedestrian underpass is under water; the only step-free route across is closed.", severity: "high", responsible: SERVICE.roads, status: "confirmed", source: "resident", minutesAgo: 150, confirmations: 6 },
  // Nowa Huta: heating season smog from illegal solid-fuel burning.
  { at: "teatralne", categoryId: "air", title: "Smoke from illegal burning", description: "Dense yellow smoke from a house chimney every evening. Smells like burning rubbish.", severity: "medium", responsible: SERVICE.guard, status: "confirmed", source: "resident", minutesAgo: 50, confirmations: 11 },
  { at: "aleja-roz", offsetMeters: [80, 140], categoryId: "air", title: "Burning smell across the estate", description: "Strong smell of smoke in the whole estate; hard to keep windows open.", severity: "medium", responsible: SERVICE.guard, status: "reported", source: "resident", minutesAgo: 25, confirmations: 3 },
  { at: "bulwarowa", offsetMeters: [-60, 40], categoryId: "air", title: "Garden waste fire", description: "Someone is burning leaves and plastic in an allotment garden.", severity: "medium", responsible: SERVICE.guard, status: "in_progress", source: "resident", minutesAgo: 40, confirmations: 5, fixInHours: 1 },
  // Kraków Główny: step-free access is broken at the main station.
  { at: "glowny", categoryId: "accessibility", title: "Lift to platform 4 out of order", description: "The only lift to platform 4 is broken; people in wheelchairs cannot reach the trains.", severity: "high", responsible: SERVICE.rail, status: "confirmed", source: "resident", minutesAgo: 600, confirmations: 15 },
  { at: "glowny", offsetMeters: [-120, -90], categoryId: "accessibility", title: "Escalator stopped at the tram tunnel", description: "The up escalator from the tram tunnel has been stopped for two days.", severity: "medium", responsible: SERVICE.rail, status: "in_progress", source: "resident", minutesAgo: 2800, confirmations: 8, fixInHours: 20 },
  // Rondo Mogilskie: a busy junction with transit and road problems.
  { at: "mogilskie", categoryId: "roads", title: "Pothole at the tram crossing", description: "A deep hole between the tram rails where cars cross; tyres have been damaged.", severity: "medium", responsible: SERVICE.roads, status: "confirmed", source: "resident", minutesAgo: 900, confirmations: 14 },
  { at: "mogilskie", offsetMeters: [90, 70], categoryId: "transit", title: "Departure board blank", description: "The live departures display at the tram stop is blank.", severity: "low", responsible: SERVICE.transit, status: "reported", source: "resident", minutesAgo: 120, confirmations: 2 },
];

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const BACKGROUND_COUNT = 70;
const STATUS_ROLL: ReportStatus[] = ["reported", "reported", "reported", "confirmed", "confirmed", "confirmed", "in_progress", "in_progress"];
/** Scenario locations get their own stories; background reports skip them. */
const SCENARIO_KEYS = new Set<string>(SCENARIOS.map((scenario) => scenario.at));

/** mulberry32: tiny seeded PRNG so the demo looks the same on every request. */
function createRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shift(location: Location, [north, east]: [number, number]) {
  const lat = location.lat + north / 111_320;
  const lng = location.lng + east / (111_320 * Math.cos((location.lat * Math.PI) / 180));
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

/** Crews promise round times: 16:15, not 16:23. */
function toQuarterHour(time: number): number {
  const quarter = 15 * MINUTE_MS;
  return Math.ceil(time / quarter) * quarter;
}

function confirmationsFor(status: ReportStatus, random: () => number): number {
  if (status === "reported") return 1 + Math.floor(random() * 2);
  return 3 + Math.floor(random() ** 2 * 25);
}

export function createSeedReports(now = Date.now(), seed = 2026): ReportDto[] {
  const random = createRandom(seed);
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const iso = (time: number) => new Date(time).toISOString();
  const byKey = new Map<string, Location>(LOCATIONS.map((location) => [location.key, location]));
  let sequence = 1000;
  const reference = () => `KRK-26-${sequence++}`;

  const scenarioReports = SCENARIOS.map((scenario, index): ReportDto => {
    const location = byKey.get(scenario.at)!;
    const reportedAt = now - scenario.minutesAgo * MINUTE_MS;
    const { lat, lng } = shift(location, scenario.offsetMeters ?? [0, 0]);
    return {
      id: `seed-s${index}`,
      reference: reference(),
      category_id: scenario.categoryId,
      title: scenario.title,
      description: scenario.description,
      status: scenario.status,
      severity: scenario.severity,
      source: scenario.source,
      reported_at: iso(reportedAt),
      updated_at: iso(reportedAt + (now - reportedAt) * 0.6),
      lat,
      lng,
      address: location.address,
      district: location.district,
      confirmations: scenario.confirmations,
      responsible: scenario.responsible,
      expected_fix_at: scenario.fixInHours ? iso(toQuarterHour(now + scenario.fixInHours * HOUR_MS)) : undefined,
      affected: scenario.affected,
    };
  });

  const backgroundLocations = LOCATIONS.filter((location) => !SCENARIO_KEYS.has(location.key));
  const used = new Set<string>();
  const backgroundReports: ReportDto[] = [];
  while (backgroundReports.length < BACKGROUND_COUNT) {
    const location = pick(backgroundLocations);
    const template = pick(BACKGROUND);
    const key = `${location.key}|${template.title}`;
    if (used.has(key)) continue;
    used.add(key);

    const status = pick(STATUS_ROLL);
    const reportedAt = now - Math.round(10 + random() ** 2 * 4 * 24 * 60) * MINUTE_MS;
    const [minFix, maxFix] = template.fixHours;
    const { lat, lng } = shift(location, [(random() - 0.5) * 160, (random() - 0.5) * 160]);
    backgroundReports.push({
      id: `seed-b${backgroundReports.length}`,
      reference: reference(),
      category_id: template.categoryId,
      title: template.title,
      description: template.description,
      status,
      severity: template.severity,
      source: "resident",
      reported_at: iso(reportedAt),
      updated_at: iso(reportedAt + (now - reportedAt) * random()),
      lat,
      lng,
      address: location.address,
      district: location.district,
      confirmations: confirmationsFor(status, random),
      responsible: template.responsible,
      expected_fix_at: status === "in_progress" ? iso(toQuarterHour(now + Math.round(minFix + random() * (maxFix - minFix)) * HOUR_MS)) : undefined,
    });
  }

  return [...scenarioReports, ...backgroundReports];
}
