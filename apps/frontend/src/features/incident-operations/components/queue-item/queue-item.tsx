import { AlertTriangle, Lock } from "@appica/icons-react";
import type { Category } from "@/api/categories/types";
import { categoryAppearance } from "@/shared/utils/category-appearance";
import { formatAgo } from "@/shared/utils/format-time";
import { REVIEW, RESPONSE, TICKET } from "../../utils/labels";
import type { QueueItem as QueueItemData } from "../../utils/queue";

type QueueItemProps = {
  item: QueueItemData;
  category: Category | undefined;
  selected: boolean;
  now: number;
  onSelect: () => void;
};

/** What the row asks of the official, or where the work stands. */
function statusLine(item: QueueItemData): string {
  if (item.review) return REVIEW[item.review.reason];
  if (item.kind === "report") return item.report.triageState === "private_issue" ? "Kept private" : "Out of scope";
  const { incident } = item;
  if (incident.ticket && incident.responseStatus !== "closed") return TICKET[incident.ticket.status];
  return RESPONSE[incident.responseStatus].label;
}

export function QueueItem({ item, category, selected, now, onSelect }: QueueItemProps) {
  const categoryId = item.kind === "incident" ? item.incident.categoryId : item.report.categoryId;
  const { Icon, textClass } = categoryAppearance(categoryId);
  const title = item.kind === "incident" ? item.incident.title : item.report.summary;
  const place = item.kind === "incident" ? item.incident.address : item.report.address;
  const reference = item.kind === "incident" ? item.incident.reference : item.report.reference;
  const isPrivate = item.kind === "report";
  const ago = formatAgo(item.sortAt, now);
  const age = !item.review ? ago : ago === "just now" ? "new" : `waiting ${ago.replace(" ago", "")}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`flex w-full flex-col gap-1 rounded-md px-3 py-2.5 text-start transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
        selected ? "bg-background-muted" : "hover:bg-background-subtle"
      }`}
    >
      <span className="flex items-center justify-between gap-2 text-xs">
        {item.urgent ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-error">
            <AlertTriangle size={14} strokeWidth={2} aria-hidden />
            Urgent
          </span>
        ) : (
          <span className={`inline-flex min-w-0 items-center gap-1.5 font-semibold ${textClass}`}>
            <Icon size={14} strokeWidth={2} aria-hidden />
            <span className="truncate">{category?.label ?? categoryId}</span>
          </span>
        )}
        <span className="shrink-0 text-foreground-muted tabular-nums">
          {age}
        </span>
      </span>
      <span className="line-clamp-2 text-sm font-medium text-foreground-intense">{title}</span>
      <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
        {isPrivate && <Lock size={12} aria-label="Private report" />}
        <span className="font-mono">{reference}</span>
        <span aria-hidden>·</span>
        <span className="truncate">{place}</span>
      </span>
      <span className={`text-xs ${item.review ? "font-medium text-foreground" : "text-foreground-muted"}`}>{statusLine(item)}</span>
    </button>
  );
}
