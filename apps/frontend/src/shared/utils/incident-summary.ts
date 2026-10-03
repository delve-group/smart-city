import { messages, type MessageKey } from "@/shared/i18n/messages";
import type { Translator } from "@/shared/i18n/locale";

export type SummaryParts = { issueType: string; place: string; precision: "street" | "building"; fallback: string };

/** An incident's one-line summary in the chosen language, from its issue type and public place; unknown types keep the server text. */
export function localizedSummary(t: Translator, { issueType, place, precision, fallback }: SummaryParts): string {
  const issueKey = `issueType.${issueType}`;
  if (!(issueKey in messages.en)) return fallback;
  return t(`incidentMap.summary.${precision}`, { issue: t(issueKey as MessageKey), place });
}
