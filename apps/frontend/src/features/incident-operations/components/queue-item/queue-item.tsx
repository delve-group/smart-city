import { AlertTriangle, Clock } from "@appica/icons-react";
import type { Category } from "@/api/categories/types";
import { categoryText, useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { categoryAppearance } from "@/shared/utils/category-appearance";
import { formatAgo, formatSpan, isJustNow } from "@/shared/utils/format-time";
import type { QueueItem as QueueItemData } from "../../utils/queue";
import { Fact } from "@/shared/components/fact/fact";

type QueueItemProps = {
  item: QueueItemData;
  category: Category | undefined;
  selected: boolean;
  now: number;
  onSelect: () => void;
};

/** What the row asks of the official, or where the work stands. */
function statusLine(item: QueueItemData, t: (key: MessageKey) => string): string {
  if (item.review) return t(`reviewLine.${item.review.reason}` as MessageKey);
  if (item.kind === "report") return item.report.triageState === "private_issue" ? t("queue.private") : t("queue.outOfScope");
  const { incident } = item;
  if (incident.ticket && incident.responseStatus !== "closed") return t(`ticket.${incident.ticket.status}` as MessageKey);
  return t(`response.${incident.responseStatus}` as MessageKey);
}

export function QueueItem({ item, category, selected, now, onSelect }: QueueItemProps) {
  const { t, locale } = useI18n();
  const categoryId = item.kind === "incident" ? item.incident.categoryId : item.report.categoryId;
  const { Icon, textClass } = categoryAppearance(categoryId);
  const title = item.kind === "incident" ? item.incident.title : item.report.summary;
  const ago = formatAgo(item.sortAt, now, locale);
  const age = !item.review ? ago : isJustNow(item.sortAt, now) ? t("queue.new") : t("queue.waiting", { time: formatSpan(item.sortAt, now, locale) });

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`flex h-18 w-full cursor-pointer flex-col justify-between gap-1 rounded-md px-3 py-4 text-start transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
        selected ? "bg-background-muted" : "hover:bg-background-subtle"
      }`}
    >
      {/* Fixed height: one title line, the rest ellipsed; the full title is in the panel. */}
      <span title={title} className="truncate text-sm font-medium text-foreground-intense">{title}</span>
      <span className="flex items-center justify-between gap-3 text-xs">
        <span className={`flex min-w-0 items-center gap-1.5 ${item.review ? "font-medium text-foreground" : "text-foreground-muted"}`}>
          {/* Colour stays on the icon only: red for urgent, the category hue otherwise. */}
          {item.urgent ? (
            <AlertTriangle size={14} strokeWidth={2} className="shrink-0 text-error" role="img" aria-label={t("queue.urgent")} />
          ) : (
            <Icon size={14} strokeWidth={2} className={`shrink-0 ${textClass}`} role="img" aria-label={category ? categoryText(t, category).label : categoryId} />
          )}
          <span aria-hidden className="text-foreground-muted">
            ·
          </span>
          <span className="truncate">{statusLine(item, t)}</span>
        </span>
        <span className="shrink-0 text-foreground-muted tabular-nums">
          <Fact icon={Clock} label={item.review ? t("queue.waitingLabel") : t("queue.updated")}>
            {age}
          </Fact>
        </span>
      </span>
    </button>
  );
}
