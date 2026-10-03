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
    baseMap: {
      land: token("--map-land"),
      residential: token("--map-residential"),
      park: token("--map-park"),
      building: token("--map-building"),
      water: token("--map-water"),
      roadMinor: token("--map-road-minor"),
      roadMajor: token("--map-road-major"),
      roadMajorCasing: token("--map-road-major-casing"),
      roadMotorway: token("--map-road-motorway"),
      roadMotorwayCasing: token("--map-road-motorway-casing"),
    },
  };
}
