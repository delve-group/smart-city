import type { PublicSearchPage } from "../search/types";
import { messages, type MessageKey } from "@/shared/i18n/messages";
import { mockPublicIncidents } from "./public-incidents";

/** The issue type in both languages, so a search in either finds Polish mock titles. */
function issueNames(issueType: string): string {
  const key = `issueType.${issueType}` as MessageKey;
  return key in messages.en ? `${messages.en[key]} ${messages.pl[key]}` : "";
}

/** Labelled UI preview only; this does not simulate semantic ranking or call a provider. */
export function mockPublicSearch(query: string, categoryIds: readonly string[]): PublicSearchPage {
  const text = query.trim().toLocaleLowerCase();
  return { status: "ready", next_cursor: null, items: mockPublicIncidents()
    .filter((incident) => categoryIds.includes(incident.category_id) && `${incident.public_summary} ${incident.public_location.label} ${issueNames(incident.issue_type)}`.toLocaleLowerCase().includes(text))
    .slice(0, 10).map((incident) => ({
      record_type: "incident", record_id: incident.id, source_version: 1,
      title: incident.public_summary, excerpt: incident.public_summary, category_id: incident.category_id,
      score: 0, indexed_at: incident.updated_at,
    })) };
}
