import { heatWeight } from "./heat-weight";

export type CrowdLevel = { label: "Quiet" | "Moderate" | "Busy" | "Very busy"; percent: number };

/** Human label plus a 0–100 reading on the same log scale as the heatmap. */
export function crowdLevel(attendance: number): CrowdLevel {
  const percent = Math.round(heatWeight({ attendance }) * 100);
  if (attendance < 150) return { label: "Quiet", percent };
  if (attendance < 800) return { label: "Moderate", percent };
  if (attendance < 3000) return { label: "Busy", percent };
  return { label: "Very busy", percent };
}
