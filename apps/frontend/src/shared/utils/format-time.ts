import type { Locale } from "@/shared/i18n/messages";
import { pluralForm } from "@/shared/i18n/messages";

const TIME_ZONE = "Europe/Warsaw";
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const formatters = {
  en: {
    time: new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }),
    weekday: new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" }),
  },
  pl: {
    time: new Intl.DateTimeFormat("pl-PL", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }),
    weekday: new Intl.DateTimeFormat("pl-PL", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" }),
  },
};

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

function plUnit(count: number, one: string, few: string, many: string): string {
  const form = pluralForm(count);
  return form === "one" ? one : form === "few" ? few : many;
}

/** Compact amount without "ago", for "waiting 12 min". */
export function formatSpan(iso: string, now: number, locale: Locale = "en"): string {
  const ms = Math.max(0, now - Date.parse(iso));
  if (ms < HOUR) {
    const minutes = Math.max(1, Math.round(ms / MINUTE));
    return locale === "pl" ? `${minutes} min` : `${minutes} min`;
  }
  if (ms < DAY) {
    const hours = Math.round(ms / HOUR);
    return locale === "pl" ? `${hours} godz.` : `${hours} h`;
  }
  const days = Math.round(ms / DAY);
  return locale === "pl" ? `${days} ${plUnit(days, "dzień", "dni", "dni")}` : `${days} ${days === 1 ? "day" : "days"}`;
}

/** "Today", "Tomorrow", "Yesterday" or "Sat 4 Oct", in Kraków time. */
function formatDay(date: Date, now: number, locale: Locale): string {
  const key = dayKey.format(date);
  if (key === dayKey.format(now)) return locale === "pl" ? "Dziś" : "Today";
  if (key === dayKey.format(now + DAY)) return locale === "pl" ? "Jutro" : "Tomorrow";
  if (key === dayKey.format(now - DAY)) return locale === "pl" ? "Wczoraj" : "Yesterday";
  return formatters[locale].weekday.format(date).replace(",", "");
}

/** "Today 18:00". */
export function formatDateTime(iso: string, now: number, locale: Locale = "en"): string {
  const date = new Date(iso);
  return `${formatDay(date, now, locale)} ${formatters[locale].time.format(date)}`;
}

/** "just now", "12 min ago", "3 h ago", "2 days ago". */
export function formatAgo(iso: string, now: number, locale: Locale = "en"): string {
  const ms = Math.max(0, now - Date.parse(iso));
  if (ms < MINUTE) return locale === "pl" ? "przed chwilą" : "just now";
  if (locale === "pl") {
    if (ms < HOUR) {
      const minutes = Math.round(ms / MINUTE);
      return `${minutes} ${plUnit(minutes, "minutę", "minuty", "minut")} temu`;
    }
    if (ms < DAY) {
      const hours = Math.round(ms / HOUR);
      return `${hours} ${plUnit(hours, "godzinę", "godziny", "godzin")} temu`;
    }
    const days = Math.round(ms / DAY);
    return `${days} ${plUnit(days, "dzień", "dni", "dni")} temu`;
  }
  if (ms < HOUR) return `${Math.round(ms / MINUTE)} min ago`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} h ago`;
  const days = Math.round(ms / DAY);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export function isJustNow(iso: string, now: number): boolean {
  return Math.max(0, now - Date.parse(iso)) < MINUTE;
}
