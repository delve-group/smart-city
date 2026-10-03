import { z } from "zod";
import { KRAKOW_BOUNDS, REPORT_SEVERITIES } from "@/api/reports/types";

/*
 * Wire shapes of resident intake, as agreed in docs/workflow-contracts.md §2–3.
 * Pure schemas: no database, session or React dependency.
 */

export const TRIAGE_STATES = ["pending", "linked", "needs_review", "private_issue", "out_of_scope"] as const;
export type TriageState = (typeof TRIAGE_STATES)[number];

export const REPORT_SCOPES = ["unit", "building", "street", "unknown"] as const;
export type ReportScope = (typeof REPORT_SCOPES)[number];

const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable();

export const draftLocationSchema = z.strictObject({
  candidate_id: optionalText(200),
  lat: z.number().min(KRAKOW_BOUNDS.south, "The location must be in Kraków.").max(KRAKOW_BOUNDS.north, "The location must be in Kraków."),
  lng: z.number().min(KRAKOW_BOUNDS.west, "The location must be in Kraków.").max(KRAKOW_BOUNDS.east, "The location must be in Kraków."),
  label: z.string().trim().min(1).max(200),
  street: optionalText(120),
  building_number: optionalText(20),
  district: optionalText(100),
  precision: z.enum(["building", "street", "point"]),
  source: z.enum(["geocoder", "map_pin", "device"]),
  /** Flat or unit detail. Private: never part of a public projection. */
  unit: optionalText(40),
});
export type DraftLocation = z.infer<typeof draftLocationSchema>;

export const draftFieldsSchema = z.strictObject({
  category_id: z.string().min(1).max(64).nullable(),
  issue_type: z.string().min(1).max(64).nullable(),
  title: z.string().trim().min(3, "Describe the problem in a few words.").max(80, "Keep the title under 80 characters.").nullable(),
  description: z.string().trim().max(1000, "Keep the description under 1,000 characters.").nullable(),
  severity: z.enum(REPORT_SEVERITIES).nullable(),
  observed_at: z.iso.datetime({ offset: true }).nullable(),
  observed_time_state: z.enum(["known", "unknown"]),
  scope: z.enum(REPORT_SCOPES),
  location: draftLocationSchema.nullable(),
  urgent: z.boolean(),
});
export type DraftFields = z.infer<typeof draftFieldsSchema>;

export const draftFieldsPatchSchema = draftFieldsSchema.partial();
export type DraftFieldsPatch = z.infer<typeof draftFieldsPatchSchema>;

export const EMPTY_DRAFT_FIELDS: DraftFields = {
  category_id: null,
  issue_type: null,
  title: null,
  description: null,
  severity: null,
  observed_at: null,
  observed_time_state: "unknown",
  scope: "unknown",
  location: null,
  urgent: false,
};

export const createDraftSchema = z.strictObject({ fields: draftFieldsPatchSchema.optional() });
export const updateDraftSchema = z.strictObject({
  expected_revision: z.number().int().positive(),
  fields: draftFieldsPatchSchema,
});
export const confirmDraftSchema = z.strictObject({
  revision: z.number().int().positive(),
  channel: z.enum(["button", "voice"]),
});
export type ConfirmationChannel = z.infer<typeof confirmDraftSchema>["channel"];
export const submitReportSchema = z.strictObject({
  draft_id: z.uuid(),
  revision: z.number().int().positive(),
});

export const REQUIRED_DRAFT_FIELDS = ["category_id", "issue_type", "title", "location"] as const;
export type MissingField = (typeof REQUIRED_DRAFT_FIELDS)[number];

export interface IntakeDraft {
  id: string;
  revision: number;
  submission_key: string;
  fields: DraftFields;
  missing_fields: MissingField[];
  readback_summary: string;
  confirmation: { revision: number; channel: ConfirmationChannel; confirmed_at: string } | null;
  submission: { report_id: string; reference: string; triage_state: TriageState; submitted_at: string } | null;
  created_at: string;
  updated_at: string;
}

/** Private projection for the report's owner and officials. Never public. */
export interface Report {
  id: string;
  reference: string;
  channel: "form" | "voice";
  category_id: string;
  issue_type: string;
  summary: string;
  original_observation: string;
  severity: "low" | "medium" | "high" | null;
  location: DraftLocation;
  observed_at: string | null;
  observed_time_state: "known" | "unknown";
  submitted_at: string;
  scope: ReportScope;
  urgent: boolean;
  triage_state: TriageState;
  incident_id: string | null;
  resident_next_step: string | null;
  version: number;
  provenance: "demo";
}
