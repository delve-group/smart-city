import { messages, type MessageKey } from "@/shared/i18n/messages";
import type { Translator } from "@/shared/i18n/locale";

/** An incident's public one-line title in the chosen language: the issue type only, since the place has its own field. Unknown types keep the server text. */
export function localizedSummary(t: Translator, { issueType, fallback }: { issueType: string; fallback: string }): string {
  const issueKey = `issueType.${issueType}`;
  return issueKey in messages.en ? t(issueKey as MessageKey) : fallback;
}

/** A staff incident title: server-made titles are the English issue label and show in the chosen language; written titles stay as they are. */
export function localizedTitle(t: Translator, { issueType, title }: { issueType: string; title: string }): string {
  const issueKey = `issueType.${issueType}`;
  return issueKey in messages.en && messages.en[issueKey as MessageKey] === title ? t(issueKey as MessageKey) : title;
}
