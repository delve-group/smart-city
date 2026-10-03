import type { CityEvent } from "@/api/events/types";
import { CATEGORY_META } from "./category-meta";

/** Lowercase and strip diacritics, so "rynek glowny" finds "Rynek Główny". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l")
    .toLowerCase();
}

/** Every word of the query must appear in the title, venue, address, category or tags. */
export function searchEvents(events: readonly CityEvent[], query: string, now: number, limit = 5): CityEvent[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  return events
    .filter((event) => Date.parse(event.endsAt) > now)
    .map((event) => {
      const title = normalize(event.title);
      const haystack = normalize(
        [event.title, event.venue, event.address, CATEGORY_META[event.category].label, ...event.tags].join(" "),
      );
      if (!words.every((word) => haystack.includes(word))) return null;
      // Title matches first, then gatherings over works and reports, then closest in time.
      const titleRank = words.every((word) => title.includes(word)) ? 0 : 2e13;
      const kindRank = CATEGORY_META[event.category].isGathering ? 0 : 1e13;
      const score = titleRank + kindRank + Math.abs(Date.parse(event.startsAt) - now);
      return { event, score };
    })
    .filter((match): match is { event: CityEvent; score: number } => match !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ event }) => event);
}

/** Events happening right now, biggest first — shown before the user types. */
export function liveEvents(events: readonly CityEvent[], now: number, limit = 5): CityEvent[] {
  return events
    .filter((event) => Date.parse(event.startsAt) <= now && Date.parse(event.endsAt) > now && event.attendance)
    .sort((a, b) => (b.attendance ?? 0) - (a.attendance ?? 0))
    .slice(0, limit);
}
