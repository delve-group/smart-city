import type { CreateReportInput, ReportDto } from "@/api/reports/types";
import { createSeedReports } from "./mock-reports";

/**
 * DEMO STORE: an in-memory list seeded with mock reports. New reports live until the
 * server restarts and are not shared between server instances. Replace with a database.
 */
let reports: ReportDto[] | null = null;
let nextReference = 5000;

export function listReports(): ReportDto[] {
  reports ??= createSeedReports();
  return reports;
}

export function addReport(input: CreateReportInput): ReportDto {
  const now = new Date().toISOString();
  const report: ReportDto = {
    id: crypto.randomUUID(),
    reference: `KRK-26-${nextReference++}`,
    category_id: input.category_id,
    title: input.title,
    description: input.description,
    status: "reported",
    severity: input.severity,
    source: "resident",
    reported_at: now,
    updated_at: now,
    lat: input.lat,
    lng: input.lng,
    address: input.address,
    district: input.district,
    confirmations: 1,
  };
  listReports().unshift(report);
  return report;
}

/** Confirmations at which the city treats a resident report as confirmed. */
const CONFIRMED_AT = 3;

/** One more resident says the problem affects them. Undefined if the report does not exist. */
export function confirmReport(id: string): ReportDto | "resolved" | undefined {
  const report = listReports().find((candidate) => candidate.id === id);
  if (!report) return undefined;
  if (report.status === "resolved") return "resolved";
  report.confirmations += 1;
  report.updated_at = new Date().toISOString();
  if (report.status === "reported" && report.confirmations >= CONFIRMED_AT) report.status = "confirmed";
  return report;
}
