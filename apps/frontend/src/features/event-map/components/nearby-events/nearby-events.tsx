import { Walk } from "@appica/icons-react";
import type { CityEvent } from "@/api/events/types";
import { formatEventStart } from "../../utils/format-event-time";
import { nearbyEvents } from "../../utils/nearby-events";
import { CategoryTile } from "../category-tile/category-tile";
import { PanelSection } from "../panel-section/panel-section";

type NearbyEventsProps = {
  event: CityEvent;
  events: readonly CityEvent[];
  now: number;
  onSelect: (event: CityEvent) => void;
};

export function NearbyEvents({ event, events, now, onSelect }: NearbyEventsProps) {
  const nearby = nearbyEvents(event, events, now);

  return (
    <PanelSection title="Nearby">
      {nearby.length === 0 ? (
        <p className="text-sm text-foreground-muted">Nothing else within a 12-minute walk.</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {nearby.map(({ event: other, walkingMinutes }) => (
            <li key={other.id}>
              <button
                type="button"
                onClick={() => onSelect(other)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-start transition-colors duration-150 hover:bg-background-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <CategoryTile category={other.category} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground-intense">{other.title}</span>
                  <span className="truncate text-xs text-foreground-muted">
                    {formatEventStart(other, now)} · {other.venue}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-foreground-muted tabular-nums">
                  <Walk size={14} aria-hidden />
                  {walkingMinutes} min
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}
