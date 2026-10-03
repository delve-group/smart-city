import { z } from "zod";
import { SearchError } from "./errors";

const id = z.string().min(1).max(200);
export const sourceRefSchema = z.object({
  record_type: z.enum(["report", "incident", "service_ticket"]),
  record_id: id,
}).strict();

/** Mirrors workflow-contracts §9 until the source service exports its runtime types. */
export const audienceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("public") }).strict(),
  z.object({ kind: z.literal("official") }).strict(),
  z.object({ kind: z.literal("institution"), institution_id: id }).strict(),
]);

export const searchSourceSchema = sourceRefSchema.extend({
  version: z.number().int().positive(),
  updated_at: z.iso.datetime(),
  category_id: id.nullable(),
  issue_type: id.nullable(),
  location: z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  }).strict().nullable(),
  projections: z.array(z.object({
    audience: audienceSchema,
    title: z.string().trim().min(1).max(200),
    text: z.string().trim().max(8_000),
  }).strict()).max(3),
}).superRefine((value, context) => {
  const kinds = new Set<string>();
  for (const { audience } of value.projections) {
    if (kinds.has(audience.kind)
      || (audience.kind === "public" && value.record_type !== "incident")
      || (audience.kind === "institution" && value.record_type !== "service_ticket")) {
      context.addIssue({ code: "custom", message: "Source projections have invalid or duplicate audiences." });
    }
    kinds.add(audience.kind);
  }
});

export const searchOptionsSchema = z.object({
  mode: z.enum(["keyword", "semantic", "hybrid"]).default("hybrid"),
  query: z.string().trim().min(1).max(1_000),
  limit: z.number().int().min(1).max(50).default(10),
  filters: z.object({
    recordTypes: z.array(sourceRefSchema.shape.record_type).min(1).max(3).optional(),
    categoryIds: z.array(id).min(1).max(20).optional(),
    issueTypes: z.array(id).min(1).max(20).optional(),
  }).strict().default({}),
}).strict();

export const candidatePayloadSchema = z.object({
  record_type: sourceRefSchema.shape.record_type,
  record_id: id,
  projection_kind: z.enum(["public", "official", "institution"]),
  source_version: z.number().int().positive(),
  indexed_at: z.iso.datetime(),
  index_revision: z.string(),
});

export type SourceRef = z.infer<typeof sourceRefSchema>;
export type Audience = z.infer<typeof audienceSchema>;
export type SearchSource = z.infer<typeof searchSourceSchema>;
export type SearchOptions = z.input<typeof searchOptionsSchema>;
export type SearchFilters = z.infer<typeof searchOptionsSchema>["filters"];
export interface SearchCandidate extends SourceRef {
  projection_kind: Audience["kind"];
  source_version: number;
  indexed_at: string;
  score: number;
}

/** Candidates must be hydrated and reauthorized by the source service before use. */
export interface CandidateResult {
  candidates: SearchCandidate[];
  elapsedMs: number;
}

export function validateSearchInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new SearchError("invalid_search_input", "Search input is invalid or exceeds its limits.", false);
  }
  return result.data;
}
