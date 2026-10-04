import { z } from "zod";
import { incidentContentSchema } from "@/shared/incidents/content";
import { REPORT_SEVERITIES } from "@/shared/utils/severity";

export const ASSESSMENTS = ["suspected", "corroborated", "verified", "disputed"] as const;
export const RESPONSE_STATUSES = ["new", "triaged", "assigned", "in_progress", "resolved", "closed"] as const;
const timestamp = z.iso.datetime({ offset: true });

/** Public allowlist from workflow-contracts §2. No report narrative or identity fields. */
export const publicIncidentSchema = z.strictObject({
  id: z.string().min(1), reference: z.string().min(1), category_id: z.string(), issue_type: z.string(),
  public_summary: z.string(), public_content: incidentContentSchema.nullable().optional(), scope: z.enum(["building", "street"]),
  assessment: z.enum(ASSESSMENTS), response_status: z.enum(RESPONSE_STATUSES),
  support_count: z.number().int().nonnegative(), severity: z.enum(REPORT_SEVERITIES).nullable(), accepts_contributions: z.boolean(),
  viewer_support: z.enum(["reporter", "contributor"]).nullable(),
  public_location: z.strictObject({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), label: z.string(), precision: z.enum(["street", "building"]) }),
  created_at: timestamp, updated_at: timestamp,
  timeline: z.array(z.strictObject({ id: z.string(), kind: z.enum(["reported", "corroborated", "verified", "disputed", "assigned", "acknowledged", "work_started", "resolved", "returned_to_review", "closed", "reopened"]), occurred_at: timestamp, text: z.string() })),
  provenance: z.enum(["demo", "live"]),
});
export type PublicIncident = z.infer<typeof publicIncidentSchema>;
export const incidentPageSchema = z.object({ items: z.array(publicIncidentSchema), next_cursor: z.string().nullable() });
export type IncidentPage = z.infer<typeof incidentPageSchema>;
export const contributionSchema = z.object({ incident_id: z.string(), membership: z.enum(["reporter", "contributor"]), support_count: z.number().int().nonnegative(), assessment: z.enum(ASSESSMENTS) });
export type Contribution = z.infer<typeof contributionSchema>;
