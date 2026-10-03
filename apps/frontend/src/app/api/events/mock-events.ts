/**
 * DEMO DATA. Fictional events around Kraków, generated deterministically.
 * Replace with the real events API; nothing here reflects actual events.
 */
import type { EventCategory, EventDto } from "@/api/events/types";

type Hotspot = { name: string; lat: number; lng: number; count: number; spread: number };

const HOTSPOTS: Hotspot[] = [
  { name: "Rynek Główny", lat: 50.0617, lng: 19.9373, count: 45, spread: 0.004 },
  { name: "Kazimierz", lat: 50.051, lng: 19.945, count: 35, spread: 0.004 },
  { name: "Podgórze", lat: 50.044, lng: 19.956, count: 20, spread: 0.005 },
  { name: "Tauron Arena", lat: 50.0675, lng: 19.9915, count: 15, spread: 0.003 },
  { name: "Błonia", lat: 50.06, lng: 19.91, count: 15, spread: 0.005 },
  { name: "Czarnowiejska", lat: 50.066, lng: 19.92, count: 20, spread: 0.004 },
  { name: "Nowa Huta", lat: 50.0717, lng: 20.0379, count: 25, spread: 0.008 },
  { name: "Bronowice", lat: 50.08, lng: 19.89, count: 10, spread: 0.008 },
  { name: "Prokocim", lat: 50.0125, lng: 20.0, count: 10, spread: 0.008 },
];

const TITLES: Record<EventCategory, string[]> = {
  culture: ["Koncert plenerowy", "Wystawa", "Spektakl", "Festiwal filmowy", "Wieczór poezji"],
  sport: ["Bieg miejski", "Mecz", "Rajd rowerowy", "Turniej siatkówki"],
  community: ["Spotkanie mieszkańców", "Piknik sąsiedzki", "Konsultacje społeczne", "Targ lokalny"],
  traffic: ["Zamknięcie ulicy", "Remont torowiska", "Objazd komunikacji"],
  safety: ["Zgłoszenie awarii oświetlenia", "Zgłoszenie dzikiego wysypiska", "Uszkodzony chodnik"],
};

const CATEGORIES = Object.keys(TITLES) as EventCategory[];
/** Reports and disruptions have no audience; the heatmap gives them the default weight. */
const HAS_ATTENDANCE = new Set<EventCategory>(["culture", "sport", "community"]);
const BASE_TIME = Date.parse("2026-10-04T08:00:00Z");
const HOUR = 3_600_000;

/** mulberry32: tiny seeded PRNG so the demo looks the same on every request. */
function createRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createMockEvents(seed = 2026): EventDto[] {
  const random = createRandom(seed);
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  // Sum of two uniforms: cheap, roughly bell-shaped scatter around the hotspot.
  const offset = (spread: number) => (random() + random() - 1) * spread * 2;

  return HOTSPOTS.flatMap((spot) =>
    Array.from({ length: spot.count }, (_, index): EventDto => {
      const category = pick(CATEGORIES);
      const attendance = Math.round(10 ** (1 + random() * 3));
      return {
        id: `demo-${spot.name.toLowerCase().replace(/\W+/g, "-")}-${index}`,
        title: `${pick(TITLES[category])} — ${spot.name}`,
        category,
        starts_at: new Date(BASE_TIME + Math.floor(random() * 14 * 24) * HOUR).toISOString(),
        lat: Number((spot.lat + offset(spot.spread)).toFixed(5)),
        lng: Number((spot.lng + offset(spot.spread * 1.5)).toFixed(5)),
        attendance: HAS_ATTENDANCE.has(category) ? attendance : undefined,
      };
    }),
  );
}
