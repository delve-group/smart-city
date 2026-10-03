/** Lowercase and strip diacritics, so "grzegorzecka" finds "Grzegórzecka". */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ł/g, "l").toLowerCase();
}

/** True when every word of the query appears somewhere in the fields; an empty query matches everything. */
export function matchesQuery(fields: readonly (string | null | undefined)[], query: string): boolean {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(fields.filter(Boolean).join(" "));
  return words.every((word) => haystack.includes(word));
}
