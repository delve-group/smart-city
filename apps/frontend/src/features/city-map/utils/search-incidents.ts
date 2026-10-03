import type { Category } from "@/api/categories/types";
import type { PublicIncident } from "@/api/incidents/types";

/** Lowercase and strip diacritics, so "grzegorzecka" finds "Grzegórzecka". */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ł/g, "l").toLowerCase();
}

/** Every word must appear in the public summary, location, category or reference. Title matches first. */
export function searchIncidents(
  incidents: readonly PublicIncident[],
  categoriesById: ReadonlyMap<string, Category>,
  query: string,
  limit = 6,
): PublicIncident[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  return incidents
    .map((incident) => {
      const title = normalize(incident.public_summary);
      const haystack = normalize(
        [incident.public_summary, incident.public_location.label, categoriesById.get(incident.category_id)?.label, incident.reference].join(" "),
      );
      if (!words.every((word) => haystack.includes(word))) return null;
      const titleRank = words.every((word) => title.includes(word)) ? 0 : 1;
      return { incident, titleRank };
    })
    .filter((match): match is { incident: PublicIncident; titleRank: number } => match !== null)
    .sort((a, b) => a.titleRank - b.titleRank || b.incident.support_count - a.incident.support_count)
    .slice(0, limit)
    .map(({ incident }) => incident);
}

/** Open incidents most residents are affected by — shown before the user types. */
export function topIncidents(incidents: readonly PublicIncident[], limit = 5): PublicIncident[] {
  return incidents
    .filter((incident) => incident.accepts_contributions)
    .toSorted((a, b) => b.support_count - a.support_count)
    .slice(0, limit);
}
