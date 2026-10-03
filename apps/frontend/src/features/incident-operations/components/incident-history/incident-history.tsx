import type { HistoryEvent } from "@/api/operations/types";
import { PanelAccordionItem } from "@/shared/components/panel-accordion-item/panel-accordion-item";
import { formatDateTime } from "@/shared/utils/format-time";

/** Audit trail, newest first: who did what, when and why. */
export function IncidentHistory({ history, now }: { history: readonly HistoryEvent[]; now: number }) {
  const newestFirst = [...history].reverse();
  return (
    <PanelAccordionItem value="history" title="History" meta={history.length}>
      <ol className="flex flex-col gap-3">
        {newestFirst.map((event) => (
          <li key={event.id} className="grid grid-cols-[5.5rem_1fr] gap-3 text-sm">
            <time dateTime={event.at} className="text-xs text-foreground-muted tabular-nums">
              {formatDateTime(event.at, now)}
            </time>
            <div className="flex flex-col gap-0.5">
              <span className="text-foreground-intense">{event.action}</span>
              <span className="text-xs text-foreground-muted">
                {event.actor}
                {event.detail && ` · ${event.detail}`}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </PanelAccordionItem>
  );
}
