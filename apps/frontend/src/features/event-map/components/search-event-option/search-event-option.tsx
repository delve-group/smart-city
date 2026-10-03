import type { CityEvent } from "@/api/events/types";
import { CATEGORY_META } from "../../utils/category-meta";
import { formatEventStart } from "../../utils/format-event-time";
import { getEventStatus } from "../../utils/event-status";
import { CategoryTile } from "../category-tile/category-tile";

export function SearchEventOption({ event, now }: { event: CityEvent; now: number }) {
  const live = getEventStatus(event, now).kind === "live";
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <CategoryTile category={event.category} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-foreground-intense">{event.title}</span>
        <span className="truncate text-xs text-foreground-muted">
          {live ? <span className="font-medium text-success-emphasis">Live now</span> : formatEventStart(event, now)}
          {" · "}
          {event.venue}
          <span className="sr-only">, {CATEGORY_META[event.category].label}</span>
        </span>
      </span>
    </span>
  );
}
