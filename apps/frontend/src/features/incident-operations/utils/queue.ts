import type { Incident, OperationsReport, Review, Workspace } from "@/api/operations/types";
import { matchesQuery } from "@/shared/utils/normalize-text";

export const QUEUE_TABS = ["review", "active", "done"] as const;
export type QueueTab = (typeof QUEUE_TABS)[number];

export const TAB_LABEL: Record<QueueTab, string> = { review: "Needs review", active: "Active", done: "Done" };

/** One row in the queue: an incident, or a report that has not joined an incident yet. */
export type QueueItem =
  | { kind: "incident"; key: string; incident: Incident; review: Review | null; urgent: boolean; sortAt: string }
  | { kind: "report"; key: string; report: OperationsReport; review: Review | null; urgent: false; sortAt: string };

export function incidentKey(id: string) {
  return `incident:${id}`;
}

export function reportKey(id: string) {
  return `report:${id}`;
}

function tabOf(item: QueueItem): QueueTab {
  if (item.review) return "review";
  if (item.kind === "report") return "done";
  return item.incident.responseStatus === "resolved" || item.incident.responseStatus === "closed" ? "done" : "active";
}

/** Search text plus the category checklist; null category ids means every category. */
export type QueueFilter = {
  query: string;
  categoryIds: ReadonlySet<string> | null;
  categoryLabel: (categoryId: string) => string | undefined;
};

export const NO_FILTER: QueueFilter = { query: "", categoryIds: null, categoryLabel: () => undefined };

export const categoryOf = (item: QueueItem) => (item.kind === "incident" ? item.incident.categoryId : item.report.categoryId);

function matches(item: QueueItem, filter: QueueFilter, workspace: Workspace): boolean {
  if (filter.categoryIds && !filter.categoryIds.has(categoryOf(item))) return false;
  const fields =
    item.kind === "incident"
      ? [
          item.incident.reference,
          item.incident.title,
          item.incident.address,
          item.incident.district,
          item.incident.ticket?.reference,
          ...workspace.reports.filter((report) => report.incidentId === item.incident.id).flatMap((report) => [report.reference, report.summary]),
        ]
      : [item.report.reference, item.report.summary, item.report.address];
  return matchesQuery([...fields, filter.categoryLabel(categoryOf(item))], filter.query);
}

/** Queue rows per tab that pass the filter. Review: urgent first, then whoever has waited longest. Others: latest change first. */
export function buildQueue(workspace: Workspace, filter: QueueFilter = NO_FILTER): Record<QueueTab, QueueItem[]> {
  const items: QueueItem[] = [
    ...workspace.incidents.map((incident) => ({
      kind: "incident" as const,
      key: incidentKey(incident.id),
      incident,
      review: incident.review,
      urgent: incident.urgent,
      sortAt: incident.review?.since ?? incident.updatedAt,
    })),
    ...workspace.reports
      .filter((report) => report.review)
      .map((report) => ({
        kind: "report" as const,
        key: reportKey(report.id),
        report,
        review: report.review,
        urgent: false as const,
        sortAt: report.review?.since ?? report.submittedAt,
      })),
  ];

  const tabs: Record<QueueTab, QueueItem[]> = { review: [], active: [], done: [] };
  for (const item of items) if (matches(item, filter, workspace)) tabs[tabOf(item)].push(item);

  tabs.review.sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.sortAt.localeCompare(b.sortAt));
  tabs.active.sort((a, b) => b.sortAt.localeCompare(a.sortAt));
  tabs.done.sort((a, b) => b.sortAt.localeCompare(a.sortAt));
  return tabs;
}

/** Reports that belong to an incident, oldest first. */
export function reportsOf(incident: Incident, reports: readonly OperationsReport[]): OperationsReport[] {
  return reports
    .filter((report) => report.incidentId === incident.id)
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

export function institutionName(workspace: Workspace, id: string): string {
  return workspace.institutions.find((institution) => institution.id === id)?.name ?? id;
}
