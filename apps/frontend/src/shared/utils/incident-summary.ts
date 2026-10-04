import type { Translator } from "@/shared/i18n/locale";
import type { IncidentContent } from "@/shared/incidents/content";

/** Stored observation text; changing routing metadata cannot rewrite the subject. */
export function localizedSummary(t: Translator, { fallback, publicContent }: { issueType?: string; fallback: string; publicContent?: IncidentContent | null }): string {
  return publicContent?.[t.locale ?? "en"].title ?? fallback;
}

export function localizedTitle(t: Translator, { title, publicContent }: { title: string; publicContent?: IncidentContent | null }): string {
  return publicContent?.[t.locale ?? "en"].title ?? title;
}
