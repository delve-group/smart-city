/**
 * DEMO DATA. Fictional events at real Kraków places, generated deterministically
 * relative to the current time so the map always has live and upcoming events.
 * Organizers are invented. Replace with the real events API.
 */
import type { EventCategory, EventDto } from "@/api/events/types";

type VenueType = "square" | "street" | "park" | "hall" | "museum" | "arena" | "stadium";

type Venue = { name: string; address: string; type: VenueType };

type Hotspot = {
  lat: number;
  lng: number;
  count: number;
  spread: number;
  /** Multiplies attendance: arenas draw bigger crowds than side streets. */
  crowdScale: number;
  venues: Venue[];
};

type Template = {
  title: string;
  description: string;
  organizer: string;
  tags: string[];
  /** Possible ticket prices in PLN; 0 = free. Empty = not applicable. */
  prices: number[];
  /** Duration range in hours. */
  hours: [number, number];
  /** Kinds of places where this event can happen. */
  venues: VenueType[];
  impact?: string;
};

const HOTSPOTS: Hotspot[] = [
  {
    lat: 50.0617, lng: 19.9373, count: 40, spread: 0.0035, crowdScale: 1.4,
    venues: [
      { name: "Sukiennice (Cloth Hall)", address: "Rynek Główny 1–3, Stare Miasto", type: "hall" },
      { name: "Plac Mariacki", address: "Plac Mariacki, Stare Miasto", type: "square" },
      { name: "Pałac pod Baranami", address: "Rynek Główny 27, Stare Miasto", type: "hall" },
      { name: "Town Hall Tower", address: "Rynek Główny 1, Stare Miasto", type: "museum" },
      { name: "Floriańska Street", address: "ul. Floriańska, Stare Miasto", type: "street" },
    ],
  },
  {
    lat: 50.051, lng: 19.945, count: 32, spread: 0.0035, crowdScale: 1,
    venues: [
      { name: "Plac Nowy", address: "Plac Nowy, Kazimierz", type: "square" },
      { name: "Tempel Synagogue", address: "ul. Miodowa 24, Kazimierz", type: "hall" },
      { name: "Szeroka Street", address: "ul. Szeroka, Kazimierz", type: "street" },
      { name: "Jewish Community Centre", address: "ul. Miodowa 24, Kazimierz", type: "hall" },
    ],
  },
  {
    lat: 50.044, lng: 19.956, count: 20, spread: 0.0045, crowdScale: 0.9,
    venues: [
      { name: "Rynek Podgórski", address: "Rynek Podgórski, Podgórze", type: "square" },
      { name: "Father Bernatek Footbridge", address: "Bulwar Podolski, Podgórze", type: "street" },
      { name: "MOCAK Museum of Contemporary Art", address: "ul. Lipowa 4, Zabłocie", type: "museum" },
      { name: "Plac Bohaterów Getta", address: "Plac Bohaterów Getta, Podgórze", type: "square" },
    ],
  },
  {
    lat: 50.0675, lng: 19.9915, count: 14, spread: 0.0025, crowdScale: 3,
    venues: [
      { name: "Tauron Arena Kraków", address: "ul. Stanisława Lema 7, Czyżyny", type: "arena" },
      { name: "Tauron Arena west plaza", address: "ul. Stanisława Lema 7, Czyżyny", type: "square" },
    ],
  },
  {
    lat: 50.06, lng: 19.91, count: 16, spread: 0.005, crowdScale: 2,
    venues: [
      { name: "Błonia Meadow", address: "al. 3 Maja, Zwierzyniec", type: "park" },
      { name: "Henryk Reyman Stadium", address: "ul. Reymonta 22, Czarna Wieś", type: "stadium" },
      { name: "Jordan Park", address: "al. 3 Maja 11, Zwierzyniec", type: "park" },
    ],
  },
  {
    lat: 50.066, lng: 19.92, count: 18, spread: 0.0035, crowdScale: 1,
    venues: [
      { name: "AGH Main Building", address: "al. Mickiewicza 30, Czarna Wieś", type: "hall" },
      { name: "Klub Studio", address: "ul. Budryka 4, Czarna Wieś", type: "hall" },
      { name: "Kraków Park", address: "al. Słowackiego, Krowodrza", type: "park" },
    ],
  },
  {
    lat: 50.0717, lng: 20.0379, count: 24, spread: 0.007, crowdScale: 1,
    venues: [
      { name: "Plac Centralny", address: "Plac Centralny im. R. Reagana, Nowa Huta", type: "square" },
      { name: "Nowa Huta Cultural Centre", address: "al. Jana Pawła II 232, Nowa Huta", type: "hall" },
      { name: "Nowa Huta Lagoon", address: "ul. Bulwarowa, Nowa Huta", type: "park" },
      { name: "Nowa Huta Meadows", address: "ul. Mierzwy, Nowa Huta", type: "park" },
    ],
  },
  {
    lat: 50.08, lng: 19.89, count: 10, spread: 0.007, crowdScale: 0.8,
    venues: [
      { name: "Młynówka Królewska Park", address: "ul. Zarzecze, Bronowice", type: "park" },
      { name: "Rydlówka Manor", address: "ul. Tetmajera 28, Bronowice", type: "museum" },
    ],
  },
  {
    lat: 50.0125, lng: 20.0, count: 10, spread: 0.007, crowdScale: 0.8,
    venues: [
      { name: "Aleksandry Park", address: "ul. Aleksandry, Bieżanów", type: "park" },
      { name: "Prokocim Market Square", address: "ul. Kurczaba, Prokocim", type: "square" },
    ],
  },
];

const TEMPLATES: Record<EventCategory, Template[]> = {
  culture: [
    {
      title: "Arena concert: Polish pop night",
      description: "A line-up of chart-topping Polish artists with a full light show. Standing tickets on the floor, seated tickets in the stands.",
      organizer: "Arena events office",
      tags: ["music", "concert", "indoor"],
      prices: [120, 180, 250],
      hours: [3, 4],
      venues: ["arena"],
      impact: "Heavy traffic around the arena before and after the show; extra night trams run until 01:00.",
    },
    {
      title: "Open-air jazz evening",
      description: "Local quartets play standards and new arrangements under the open sky. Bring a blanket — seating is limited and fills up early.",
      organizer: "Old Town Jazz Collective",
      tags: ["music", "outdoor", "evening"],
      prices: [0, 0, 30],
      hours: [2, 3],
      venues: ["square", "park"],
    },
    {
      title: "Young Polish photography",
      description: "A group show of emerging photographers exploring post-industrial landscapes. Guided tours start on the hour; the last entry is 30 minutes before closing.",
      organizer: "Vistula Photo Foundation",
      tags: ["exhibition", "art", "indoor"],
      prices: [0, 20, 25],
      hours: [6, 8],
      venues: ["museum", "hall"],
    },
    {
      title: "Chamber music by candlelight",
      description: "A string quartet performs Górecki, Szymanowski and Haydn in an intimate candlelit room. Doors open 20 minutes before the start.",
      organizer: "Kraków Chamber Society",
      tags: ["music", "classical", "indoor"],
      prices: [45, 60, 80],
      hours: [1, 2],
      venues: ["hall"],
    },
    {
      title: "Street theatre parade",
      description: "Stilt walkers, puppeteers and brass bands wind through the streets, ending with a short performance on the square. Family friendly.",
      organizer: "Street Stories Festival",
      tags: ["theatre", "family", "outdoor"],
      prices: [0],
      hours: [2, 3],
      venues: ["square", "street"],
      impact: "Rolling street closures along the parade route; trams may be held for a few minutes.",
    },
    {
      title: "Film under the stars",
      description: "Classic Polish cinema with English subtitles on a big outdoor screen. Deckchairs available on a first-come basis.",
      organizer: "Kino Plener",
      tags: ["film", "outdoor", "evening"],
      prices: [0, 15],
      hours: [2, 3],
      venues: ["park", "square"],
    },
  ],
  sport: [
    {
      title: "Volleyball league match",
      description: "PlusLiga fixture with a full arena. Doors open an hour before the first serve; food stalls on the concourse.",
      organizer: "Arena events office",
      tags: ["volleyball", "spectator", "indoor"],
      prices: [35, 55, 80],
      hours: [2, 3],
      venues: ["arena"],
      impact: "Expect queues on the trams to Czyżyny and full car parks around the arena.",
    },
    {
      title: "City evening run",
      description: "A 5 km and 10 km loop through the city centre with timing chips and a finish-line festival. Registration closes one hour before the start.",
      organizer: "Kraków Runners",
      tags: ["running", "outdoor"],
      prices: [0, 60],
      hours: [2, 4],
      venues: ["street", "park"],
      impact: "Roads on the route are closed to cars from 30 minutes before the start until the last runner passes.",
    },
    {
      title: "Ekstraklasa football match",
      description: "League fixture with a sold-out home end. Gates open 90 minutes before kick-off; bags larger than A4 are not allowed.",
      organizer: "Stadium operator",
      tags: ["football", "spectator"],
      prices: [40, 65, 90],
      hours: [2, 3],
      venues: ["stadium"],
      impact: "Heavy traffic and extra trams before and after the match. Parking near the stadium is restricted.",
    },
    {
      title: "Sunday group bike ride",
      description: "A relaxed 25 km ride along the Vistula boulevards with a coffee stop. City bikes welcome; helmets recommended.",
      organizer: "Velo Kraków",
      tags: ["cycling", "outdoor", "family"],
      prices: [0],
      hours: [2, 3],
      venues: ["park", "street"],
    },
    {
      title: "Beach volleyball tournament",
      description: "Amateur pairs compete in a one-day knockout. Spectators welcome on the grass terraces.",
      organizer: "Volley Club Kraków",
      tags: ["volleyball", "outdoor"],
      prices: [0],
      hours: [5, 7],
      venues: ["park"],
    },
    {
      title: "Open-air yoga",
      description: "An all-levels session led by local instructors. Bring your own mat and water.",
      organizer: "Park Yoga Kraków",
      tags: ["wellbeing", "outdoor"],
      prices: [0, 20],
      hours: [1, 2],
      venues: ["park"],
    },
  ],
  community: [
    {
      title: "District council open meeting",
      description: "Residents can ask questions about local investments, green space and parking. The agenda is published one week before the meeting.",
      organizer: "District Council",
      tags: ["civic", "meeting"],
      prices: [0],
      hours: [2, 3],
      venues: ["hall"],
    },
    {
      title: "Neighbourhood picnic",
      description: "Food stalls, board games and a kids' corner. Bring something to share and meet the neighbours.",
      organizer: "Neighbours' Association",
      tags: ["family", "food", "outdoor"],
      prices: [0],
      hours: [3, 5],
      venues: ["park", "square"],
    },
    {
      title: "Public consultation: new green square",
      description: "Planners present three designs for a new pocket park and collect feedback on trees, benches and play areas.",
      organizer: "City Greenery Board",
      tags: ["civic", "urban planning"],
      prices: [0],
      hours: [2, 3],
      venues: ["hall"],
    },
    {
      title: "Farmers' market",
      description: "Seasonal vegetables, cheeses and baked goods from producers in Małopolska. Cash and cards accepted at most stalls.",
      organizer: "Local Producers' Cooperative",
      tags: ["food", "market"],
      prices: [0],
      hours: [5, 6],
      venues: ["square"],
    },
    {
      title: "Repair café",
      description: "Volunteers help fix small appliances, bikes and clothes for free. Bring the item and any spare parts you have.",
      organizer: "Fix It Kraków",
      tags: ["sustainability", "workshop"],
      prices: [0],
      hours: [3, 4],
      venues: ["hall"],
    },
  ],
  traffic: [
    {
      title: "Street closure for utility works",
      description: "Water main replacement. Pedestrian access to shops and homes is maintained on one side of the street.",
      organizer: "Municipal Water Company",
      tags: ["road works"],
      prices: [],
      hours: [24, 96],
      venues: ["street", "square"],
      impact: "Closed to cars in both directions. Follow the signed detour.",
    },
    {
      title: "Tram track renewal",
      description: "Replacement of rails and the tram stop platform. Night work is limited to 22:00 and finishes by 06:00.",
      organizer: "Municipal Transport Authority",
      tags: ["public transport", "road works"],
      prices: [],
      hours: [48, 120],
      venues: ["street", "square"],
      impact: "Trams diverted; replacement buses run every 10 minutes.",
    },
    {
      title: "Bus route detour",
      description: "Temporary change to bus routes while a junction is rebuilt. Stops on the detour are marked with yellow signs.",
      organizer: "Municipal Transport Authority",
      tags: ["public transport"],
      prices: [],
      hours: [12, 72],
      venues: ["street", "square"],
      impact: "Two stops are suspended; journeys take about 5 minutes longer.",
    },
  ],
  safety: [
    {
      title: "Street light outage",
      description: "Residents reported several street lights out along a footpath. A repair crew has been assigned.",
      organizer: "Reported by residents",
      tags: ["lighting", "report"],
      prices: [],
      hours: [12, 48],
      venues: ["street", "park"],
      impact: "Poor lighting after dark — use the main street where possible.",
    },
    {
      title: "Illegal dumping reported",
      description: "Bulky waste left next to recycling bins. The city cleaning service is scheduled to collect it.",
      organizer: "Reported by a resident",
      tags: ["waste", "report"],
      prices: [],
      hours: [24, 72],
      venues: ["street", "park", "square"],
    },
    {
      title: "Damaged pavement",
      description: "Raised paving slabs create a trip hazard near a crossing. The area has been marked with tape.",
      organizer: "Reported by a resident",
      tags: ["pavement", "report"],
      prices: [],
      hours: [24, 96],
      venues: ["street", "square"],
      impact: "Narrowed footpath; prams and wheelchairs should use the opposite side.",
    },
    {
      title: "Fallen tree branch",
      description: "A large branch came down after strong wind. Arborists will secure the tree and clear the path.",
      organizer: "City Greenery Board",
      tags: ["trees", "report"],
      prices: [],
      hours: [6, 24],
      venues: ["park"],
      impact: "Path through the park closed until cleared.",
    },
  ],
};

const CATEGORIES = Object.keys(TEMPLATES) as EventCategory[];

/** How often each category appears; reports and works are rarer than gatherings. */
const CATEGORY_WEIGHT: Record<EventCategory, number> = { culture: 3, sport: 2, community: 2, traffic: 1, safety: 1 };

/** Templates with at least one fitting venue in the hotspot — no football matches on a market square. */
function compatibleTemplates(spot: Hotspot) {
  const types = new Set(spot.venues.map((venue) => venue.type));
  return CATEGORIES.flatMap((category) => {
    const templates = TEMPLATES[category].filter((template) => template.venues.some((type) => types.has(type)));
    // Repeat each category's template list by its weight, spread evenly across its templates.
    return Array.from({ length: CATEGORY_WEIGHT[category] * 6 }, (_, index) => templates[index % templates.length])
      .filter((template) => template !== undefined)
      .map((template) => ({ category, template }));
  });
}
/** Categories that gather people; the rest are reports and works without an audience. */
const GATHERINGS = new Set<EventCategory>(["culture", "sport", "community"]);
const HOUR = 3_600_000;

/** Moves gatherings that would start at night (Kraków time, UTC+2 in October) to the evening. */
function atSensibleHour(time: number): number {
  const localHour = (new Date(time).getUTCHours() + 2) % 24;
  if (localHour >= 8 && localHour <= 21) return time;
  const day = new Date(time);
  day.setUTCHours(16, 0, 0, 0); // 18:00 local
  return day.getTime();
}

/** mulberry32: tiny seeded PRNG so the demo looks the same on every request. */
function createRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createMockEvents(now = Date.now(), seed = 2026): EventDto[] {
  const random = createRandom(seed);
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const between = (min: number, max: number) => min + random() * (max - min);
  // Sum of two uniforms: cheap, roughly bell-shaped scatter around the hotspot.
  const offset = (spread: number) => (random() + random() - 1) * spread * 2;
  const thisHour = Math.floor(now / HOUR) * HOUR;

  return HOTSPOTS.flatMap((spot, spotIndex) => {
    const options = compatibleTemplates(spot);
    const used = new Set<string>();
    /** The same event twice at one venue reads as a bug, so retry a few times. */
    const pickUnique = () => {
      for (let attempt = 0; ; attempt++) {
        const { category, template } = pick(options);
        const venue = pick(spot.venues.filter((candidate) => template.venues.includes(candidate.type)));
        const key = `${template.title}|${venue.name}`;
        if (!used.has(key) || attempt >= 8) {
          used.add(key);
          return { category, template, venue };
        }
      }
    };

    return Array.from({ length: spot.count }, (_, index): EventDto => {
      const { category, template, venue } = pickUnique();
      const gathering = GATHERINGS.has(category);

      // Gatherings: mostly the next two days. Reports started in the past and are still open.
      const startOffset = gathering ? -4 + random() ** 2 * 7 * 24 : -between(2, 60);
      const start = gathering ? atSensibleHour(thisHour + Math.round(startOffset) * HOUR) : thisHour + Math.round(startOffset) * HOUR;
      const end = start + Math.round(between(...template.hours)) * HOUR;
      const attendance = Math.round(10 ** between(1.3, 3.6) * spot.crowdScale);

      return {
        id: `demo-${spotIndex}-${index}`,
        title: template.title,
        category,
        starts_at: new Date(start).toISOString(),
        ends_at: new Date(end).toISOString(),
        venue: venue.name,
        address: `${venue.address}, Kraków`,
        lat: Number((spot.lat + offset(spot.spread)).toFixed(5)),
        lng: Number((spot.lng + offset(spot.spread * 1.5)).toFixed(5)),
        description: template.description,
        organizer: template.organizer,
        attendance: gathering ? attendance : undefined,
        price_pln: template.prices.length > 0 ? pick(template.prices) : undefined,
        tags: template.tags,
        wheelchair_accessible: gathering ? random() > 0.3 : undefined,
        impact: template.impact ?? (gathering && attendance > 3000 ? "Large crowd expected — nearby trams and buses will be busy." : undefined),
      };
    });
  });
}
