import { AlertTriangle, Clock } from "@appica/icons-react";
import type { Category } from "@/api/categories/types";
import { categoryAppearance } from "@/shared/utils/category-appearance";
import { formatAgo } from "@/shared/utils/format-time";
import { REVIEW, RESPONSE, TICKET } from "../../utils/labels";
import type { QueueItem as QueueItemData } from "../../utils/queue";
import { Fact } from "../fact/fact";

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
  const ago = formatAgo(item.sortAt, now);
  const age = !item.review ? ago : ago === "just now" ? "new" : `waiting ${ago.replace(" ago", "")}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`flex h-28 w-full flex-col justify-between gap-2 rounded-md px-3 py-4 text-start transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
        selected ? "bg-background-muted" : "hover:bg-background-subtle"
      }`}
    >
      {/* Fixed height: two title lines max, status pinned to the bottom so rows line up. */}
      <span className="line-clamp-2 text-sm font-medium text-foreground-intense">{title}</span>
      <span className="flex items-center justify-between gap-3 text-xs">
        <span className={`flex min-w-0 items-center gap-1.5 ${item.review ? "font-medium text-foreground" : "text-foreground-muted"}`}>
          {/* Colour stays on the icon only: red for urgent, the category hue otherwise. */}
          {item.urgent ? (
            <AlertTriangle size={14} strokeWidth={2} className="shrink-0 text-error" role="img" aria-label="Urgent" />
          ) : (
            <Icon size={14} strokeWidth={2} className={`shrink-0 ${textClass}`} role="img" aria-label={category?.label ?? categoryId} />
          )}
          <span aria-hidden className="text-foreground-muted">
            ·
          </span>
          <span className="truncate">{statusLine(item)}</span>
        </span>
        <span className="shrink-0 text-foreground-muted tabular-nums">
          <Fact icon={Clock} label={item.review ? "Waiting" : "Updated"}>
            {age}
          </Fact>
        </span>
      </span>
    </button>
  );
}
