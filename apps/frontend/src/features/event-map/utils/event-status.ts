import type { CityEvent } from "@/api/events/types";

export type EventStatus =
  | { kind: "live"; endsInMs: number }
  | { kind: "upcoming"; startsInMs: number }
  | { kind: "ended" };

export function getEventStatus(event: Pick<CityEvent, "startsAt" | "endsAt">, now: number): EventStatus {
  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt);
  if (now >= end) return { kind: "ended" };
  if (now >= start) return { kind: "live", endsInMs: end - now };
  return { kind: "upcoming", startsInMs: start - now };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "45 min", "3 h", "2 days". */
export function formatDuration(ms: number): string {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MINUTE))} min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} h`;
  const days = Math.round(ms / DAY);
  return `${days} ${days === 1 ? "day" : "days"}`;
}
