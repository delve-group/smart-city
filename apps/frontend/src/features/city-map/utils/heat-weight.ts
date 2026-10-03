import type { CityReport, ReportSeverity } from "@/api/reports/types";

const SEVERITY_WEIGHT: Record<ReportSeverity, number> = { low: 0.35, medium: 0.6, high: 1 };
/** Confirmations at which a report reaches its severity's full weight. */
const FULL_CONFIRMATIONS = 30;

/** Severity sets the ceiling; confirmations from other residents push a report towards it. 0.1–1. */
export function heatWeight(report: Pick<CityReport, "severity" | "confirmations">): number {
  const confidence = Math.min(1, Math.log10(report.confirmations + 1) / Math.log10(FULL_CONFIRMATIONS + 1));
  return Math.max(0.1, SEVERITY_WEIGHT[report.severity] * (0.55 + 0.45 * confidence));
}
