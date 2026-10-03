import { categoryAppearance } from "@/shared/utils/category-appearance";

/** Map layers need literal colours, so read them from the active theme tokens. */
export function readMapColors(categoryIds: readonly string[]) {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    heat: { low: token("--info"), mid: token("--warning"), high: token("--error") },
    category: Object.fromEntries(categoryIds.map((id) => [id, token(categoryAppearance(id).token)])),
    fallback: token("--foreground-muted"),
    surface: token("--background"),
  };
}
