import type { CityEvent } from "@/api/events/types";

const TIME_ZONE = "Europe/Warsaw";
const time = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const weekdayDate = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

const DAY = 86_400_000;

/** "Today", "Tomorrow", "Yesterday" or "Sat 4 Oct", in Kraków time. */
export function formatDay(date: Date, now: number): string {
  const key = dayKey.format(date);
  if (key === dayKey.format(now)) return "Today";
  if (key === dayKey.format(now + DAY)) return "Tomorrow";
  if (key === dayKey.format(now - DAY)) return "Yesterday";
  return weekdayDate.format(date).replace(",", "");
}

/** "Today · 18:00–21:00", or "Sat 4 Oct 18:00 – Mon 6 Oct 09:00" across days. */
export function formatEventWhen(event: Pick<CityEvent, "startsAt" | "endsAt">, now: number): string {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  if (dayKey.format(start) === dayKey.format(end)) {
    return `${formatDay(start, now)} · ${time.format(start)}–${time.format(end)}`;
  }
  return `${formatDay(start, now)} ${time.format(start)} – ${formatDay(end, now)} ${time.format(end)}`;
}

/** "Today 18:00" — compact start time for lists. */
export function formatEventStart(event: Pick<CityEvent, "startsAt">, now: number): string {
  const start = new Date(event.startsAt);
  return `${formatDay(start, now)} ${time.format(start)}`;
}
