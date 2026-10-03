import { z } from "zod";
import { KRAKOW_BOUNDS } from "@/shared/utils/krakow";

export { KRAKOW_BOUNDS } from "@/shared/utils/krakow";

export const REPORT_STATUSES = ["reported", "confirmed", "in_progress", "resolved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_SEVERITIES = ["low", "medium", "high"] as const;
export type ReportSeverity = (typeof REPORT_SEVERITIES)[number];

/** Wire format of one report. Demo contract until the real API is known. */
export const reportDtoSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  /** Required: every report belongs to exactly one API-defined category. */
  category_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(REPORT_STATUSES),
  severity: z.enum(REPORT_SEVERITIES),
  source: z.enum(["resident", "city"]),
  reported_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(1),
  district: z.string().optional(),
  /** Residents who confirmed the problem, the reporter included. */
  confirmations: z.number().int().nonnegative(),
  /** Service responsible for the fix. */
  responsible: z.string().optional(),
  expected_fix_at: z.iso.datetime({ offset: true }).optional(),
  /** Plain-language scope, e.g. "about 1,200 households". */
  affected: z.string().optional(),
});

export type ReportDto = z.infer<typeof reportDtoSchema>;

export const reportsResponseSchema = z.object({
  source: z.string(),
  reports: z.array(z.unknown()),
});

export type ReportsResponseDto = { source: string; reports: ReportDto[] };

/** Body of POST /api/reports. Shared by the form and the route handler. */
export const createReportInputSchema = z.object({
  category_id: z.string().min(1, "Choose a category."),
  title: z.string().trim().min(3, "Describe the problem in a few words.").max(80, "Keep the title under 80 characters."),
  description: z.string().trim().max(1000, "Keep the description under 1,000 characters."),
  severity: z.enum(REPORT_SEVERITIES),
  lat: z.number().min(KRAKOW_BOUNDS.south).max(KRAKOW_BOUNDS.north),
  lng: z.number().min(KRAKOW_BOUNDS.west).max(KRAKOW_BOUNDS.east),
  address: z.string().trim().min(1).max(200),
  district: z.string().trim().max(100).optional(),
});

export type CreateReportInput = z.infer<typeof createReportInputSchema>;

export type CityReport = {
  id: string;
  reference: string;
  categoryId: string;
  title: string;
  description: string;
  status: ReportStatus;
  severity: ReportSeverity;
  source: "resident" | "city";
  reportedAt: string;
  updatedAt: string;
  location: { lat: number; lng: number };
  address: string;
  district?: string;
  confirmations: number;
  responsible?: string;
  expectedFixAt?: string;
  affected?: string;
};

export type ReportsResult = {
  /** "demo" while the endpoint serves mock data. */
  source: string;
  reports: CityReport[];
  /** Records dropped for not matching the contract or an unknown category. */
  invalidCount: number;
};
