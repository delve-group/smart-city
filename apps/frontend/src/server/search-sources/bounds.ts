/** Search uses bounded excerpts; the authoritative record remains complete. */
export const searchTitle = (value: string): string => value.slice(0, 200);
export function searchText(value: string): string {
  const suffix = "\n[Search excerpt shortened; open the source for full details.]";
  return value.length <= 8_000 ? value : value.slice(0, 8_000 - suffix.length) + suffix;
}
