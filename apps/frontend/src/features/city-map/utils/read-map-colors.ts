import { categoryAppearance } from "@/shared/utils/category-appearance";

/** Map layers need literal colours, so read them from the active theme tokens. */
export function readMapColors(categoryIds: readonly string[]) {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    heat: { low: token("--heat-low"), mid: token("--heat-mid"), high: token("--heat-high") },
    category: Object.fromEntries(categoryIds.map((id) => [id, token(categoryAppearance(id).token)])),
    fallback: token("--foreground-muted"),
    surface: token("--background"),
    roads: {
      minor: token("--map-road-minor"),
      major: token("--map-road-major"),
      majorCasing: token("--map-road-major-casing"),
      motorway: token("--map-road-motorway"),
      motorwayCasing: token("--map-road-motorway-casing"),
    },
  };
}
