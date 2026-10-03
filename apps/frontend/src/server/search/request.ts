import { z } from "zod";
import { sourceRefSchema, validateSearchInput } from "./types";

const filterId = z.string().trim().min(1).max(200);
export const recordsSearchSchema = z.object({
  q: z.string().trim().min(1).max(1_000).optional(),
  mode: z.enum(["keyword", "semantic", "hybrid"]).default("hybrid"),
  limit: z.number().int().min(1).max(50).default(10),
  category_id: z.array(filterId).max(20).default([]),
  issue_type: z.array(filterId).max(20).default([]),
  record_type: z.array(sourceRefSchema.shape.record_type).max(3).default([]),
  related_type: sourceRefSchema.shape.record_type.optional(),
  related_id: filterId.optional(),
}).strict().superRefine((value, context) => {
  const related = value.related_type !== undefined || value.related_id !== undefined;
  if ((related && (!value.related_type || !value.related_id || value.q !== undefined))
    || (!related && value.q === undefined)) {
    context.addIssue({ code: "custom", message: "Supply q or both related_type and related_id." });
  }
});

export type RecordsSearchInput = z.input<typeof recordsSearchSchema>;

/** Reject unknown keys and repeated scalar parameters instead of silently choosing one. */
export function parseSearchQuery(parameters: URLSearchParams) {
  const repeated = new Set(["category_id", "issue_type", "record_type"]);
  const input: Record<string, unknown> = {};
  for (const key of new Set(parameters.keys())) {
    const values = parameters.getAll(key);
    input[key] = repeated.has(key) ? values : values.length === 1
      ? key === "limit" && /^\d+$/.test(values[0]) ? Number(values[0]) : values[0]
      : values;
  }
  return validateSearchInput(recordsSearchSchema, input);
}
