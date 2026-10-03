/* Search-source handoff to the search workstream, as agreed in docs/workflow-contracts.md §9. */

export type SourceRecordType = "report" | "incident" | "service_ticket";
export type SourceRef = { record_type: SourceRecordType; record_id: string };

export type Audience =
  | { kind: "public" }
  | { kind: "official" }
  | { kind: "institution"; institution_id: string };

export type SearchSource = SourceRef & {
  version: number;
  updated_at: string;
  category_id: string | null;
  issue_type: string | null;
  location: { lat: number; lng: number } | null;
  /** Text each audience may search. Empty: the record must leave the index. */
  projections: { audience: Audience; title: string; text: string }[];
};

export type SearchHit = {
  ref: SourceRef;
  version: number;
  title: string;
  excerpt: string;
  category_id: string | null;
};
