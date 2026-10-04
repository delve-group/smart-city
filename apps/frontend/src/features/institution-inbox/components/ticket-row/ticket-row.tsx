import { Clock } from "@appica/icons-react";
import type { InstitutionTicket } from "@/api/institution/types";
import { Fact } from "@/shared/components/fact/fact";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { categoryAppearance } from "@/shared/utils/category-appearance";
import { formatAgo } from "@/shared/utils/format-time";
import { ticketSummary } from "../../utils/labels";

type TicketRowProps = { ticket: InstitutionTicket; selected: boolean; now: number; onSelect: () => void };

/** One ticket in the inbox list. Same shape as an operations queue row. */
export function TicketRow({ ticket, selected, now, onSelect }: TicketRowProps) {
  const { t, locale } = useI18n();
  const { categoryId } = ticket.incident;
  const summary = ticketSummary(t, ticket);
  const { Icon, textClass } = categoryAppearance(categoryId);
  const waiting = ticket.status === "created";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`flex h-18 w-full cursor-pointer flex-col justify-between gap-1 rounded-md px-3 py-4 text-start transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
        selected ? "bg-background-muted" : "hover:bg-background-subtle"
      }`}
    >
      {/* Fixed height: one title line, the rest ellipsed; the full title is in the detail. */}
      <span title={summary} className="truncate text-sm font-medium text-foreground-intense">{summary}</span>
      <span className="flex items-center justify-between gap-3 text-xs">
        <span className={`flex min-w-0 items-center gap-1.5 ${waiting ? "font-medium text-foreground" : "text-foreground-muted"}`}>
          {/* Colour stays on the category icon only. */}
          <Icon size={14} strokeWidth={2} className={`shrink-0 ${textClass}`} role="img" aria-label={categoryId} />
          <span aria-hidden className="text-foreground-muted">
            ·
          </span>
          <span className="max-w-[45%] shrink-0 truncate">{ticket.incident.locationLabel}</span>
          <span aria-hidden className="text-foreground-muted">
            ·
          </span>
          <span className="min-w-0 truncate">{t(`inboxStatus.${ticket.status}` as MessageKey)}</span>
        </span>
        <span className="shrink-0 text-foreground-muted tabular-nums">
          <Fact icon={Clock} label={t("inbox.received")}>
            {formatAgo(ticket.createdAt, now, locale)}
          </Fact>
        </span>
      </span>
    </button>
  );
}
