import type { ReportSeverity } from "@/api/reports/types";

export const SEVERITY_LABEL: Record<ReportSeverity, string> = {
  low: "Minor",
  medium: "Affects daily life",
  high: "Urgent or dangerous",
};

/** Helps residents pick a severity they can judge themselves. */
export const SEVERITY_HINT: Record<ReportSeverity, string> = {
  low: "An inconvenience, nothing is blocked.",
  medium: "Blocks a route, a service or a building.",
  high: "Risk to people or property right now.",
};
