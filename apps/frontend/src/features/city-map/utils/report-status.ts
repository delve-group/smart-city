import type { ReportStatus } from "@/api/reports/types";

export const STATUS_LABEL: Record<ReportStatus, string> = {
  reported: "Reported",
  confirmed: "Confirmed",
  in_progress: "In progress",
  resolved: "Resolved",
};

/** What each step means to a resident. */
export const STATUS_HINT: Record<ReportStatus, string> = {
  reported: "Waiting for other residents or the city to confirm.",
  confirmed: "Confirmed and passed to the responsible service.",
  in_progress: "A crew is working on it.",
  resolved: "Fixed. Report again if the problem comes back.",
};

export const STATUS_STEPS: ReportStatus[] = ["reported", "confirmed", "in_progress", "resolved"];
