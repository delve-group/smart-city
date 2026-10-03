import { EVENT_CATEGORIES, type EventCategory } from "@/api/events/types";

/** Map layers need literal colours, so read them from the active theme tokens. */
export function readMapColors() {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  const category = Object.fromEntries(
    EVENT_CATEGORIES.map((name) => [name, token(`--category-${name}`)]),
  ) as Record<EventCategory, string>;
  return {
    heat: { low: token("--info"), mid: token("--warning"), high: token("--error") },
    category,
    surface: token("--background"),
    ink: token("--foreground-intense"),
  };
}
