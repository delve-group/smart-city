import { CATEGORIES } from "@/app/api/categories/categories";

export interface IssueType {
  id: string;
  /** Null: accepted with every category. */
  category_id: string | null;
  label: string;
}

/** DEMO CONFIGURATION. Only `power_outage` is grouped automatically; `other` fits every category. */
export const ISSUE_TYPES: IssueType[] = [
  { id: "power_outage", category_id: "power", label: "Power outage" },
  { id: "street_light_fault", category_id: "power", label: "Street light fault" },
  { id: "exposed_cable", category_id: "power", label: "Exposed cable" },
  { id: "water_outage", category_id: "water", label: "No water" },
  { id: "burst_pipe", category_id: "water", label: "Burst pipe or leak" },
  { id: "blocked_drain", category_id: "water", label: "Blocked drain" },
  { id: "pothole", category_id: "roads", label: "Pothole or road damage" },
  { id: "traffic_signal_fault", category_id: "roads", label: "Traffic signal fault" },
  { id: "transit_disruption", category_id: "transit", label: "Stop or service disruption" },
  { id: "illegal_dumping", category_id: "waste", label: "Illegal dumping" },
  { id: "overflowing_bin", category_id: "waste", label: "Overflowing bin" },
  { id: "broken_lift", category_id: "accessibility", label: "Broken lift" },
  { id: "blocked_access", category_id: "accessibility", label: "Blocked ramp or pavement" },
  { id: "fallen_tree", category_id: "greenery", label: "Fallen tree or branch" },
  { id: "smoke", category_id: "air", label: "Smoke or burning" },
  { id: "noise", category_id: "air", label: "Noise" },
  { id: "other", category_id: null, label: "Something else" },
];

export function isKnownCategory(categoryId: string): boolean {
  return CATEGORIES.some((category) => category.id === categoryId);
}

export function categoryLabel(categoryId: string): string {
  return CATEGORIES.find((category) => category.id === categoryId)?.label ?? categoryId;
}

export function findIssueType(issueTypeId: string): IssueType | undefined {
  return ISSUE_TYPES.find((issueType) => issueType.id === issueTypeId);
}

export function issueTypeFitsCategory(issueTypeId: string, categoryId: string): boolean {
  const issueType = findIssueType(issueTypeId);
  return Boolean(issueType) && (issueType!.category_id === null || issueType!.category_id === categoryId);
}
