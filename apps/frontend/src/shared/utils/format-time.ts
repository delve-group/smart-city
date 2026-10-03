const TIME_ZONE = "Europe/Warsaw";
const time = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const weekdayDate = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Today", "Tomorrow", "Yesterday" or "Sat 4 Oct", in Kraków time. */
function formatDay(date: Date, now: number): string {
  const key = dayKey.format(date);
  if (key === dayKey.format(now)) return "Today";
  if (key === dayKey.format(now + DAY)) return "Tomorrow";
  if (key === dayKey.format(now - DAY)) return "Yesterday";
  return weekdayDate.format(date).replace(",", "");
}

/** "Today 18:00". */
export function formatDateTime(iso: string, now: number): string {
  const date = new Date(iso);
  return `${formatDay(date, now)} ${time.format(date)}`;
}

/** "just now", "12 min ago", "3 h ago", "2 days ago". */
export function formatAgo(iso: string, now: number): string {
  const ms = Math.max(0, now - Date.parse(iso));
  if (ms < MINUTE) return "just now";
  if (ms < HOUR) return `${Math.round(ms / MINUTE)} min ago`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} h ago`;
  const days = Math.round(ms / DAY);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
