import { Clock, MapPin, Users } from "@appica/icons-react";
import { Meter, MeterProgress } from "@appica/ui-react/meter";
import type { CityEvent } from "@/api/events/types";
import { crowdLevel } from "../../utils/crowd-level";
import { formatEventWhen } from "../../utils/format-event-time";
import { CategoryLabel } from "../category-label/category-label";
import { EventStatusBadge } from "../event-status-badge/event-status-badge";

const OFFSET = 16;
const WIDTH = 288;
const count = new Intl.NumberFormat("en-GB");

type EventTooltipProps = {
  event: CityEvent;
  now: number;
  /** Pointer position relative to the map. */
  x: number;
  y: number;
  bounds: { width: number; height: number };
};

/** Follows the pointer and flips away from the nearest edge. Purely informational. */
export function EventTooltip({ event, now, x, y, bounds }: EventTooltipProps) {
  const flipX = x + OFFSET + WIDTH > bounds.width;
  const flipY = y > bounds.height * 0.6;
  const crowd = event.attendance !== undefined ? crowdLevel(event.attendance) : undefined;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 flex w-72 flex-col gap-2.5 rounded-lg border border-border bg-background p-3.5 shadow-lg transition-[opacity,scale] duration-150 ease-out starting:scale-95 starting:opacity-0 motion-reduce:transition-none"
      style={{
        left: x,
        top: y,
        transform: `translate(${flipX ? `calc(-100% - ${OFFSET}px)` : `${OFFSET}px`}, ${flipY ? `calc(-100% - ${OFFSET}px)` : `${OFFSET}px`})`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <CategoryLabel category={event.category} />
        <EventStatusBadge event={event} now={now} />
      </div>

      <p className="line-clamp-2 text-base leading-snug font-semibold text-balance text-foreground-intense">
        {event.title}
      </p>

      <dl className="flex flex-col gap-1.5 text-sm text-foreground">
        <div className="flex items-start gap-2">
          <dt className="sr-only">When</dt>
          <Clock size={16} aria-hidden className="mt-0.5 shrink-0 text-foreground-subtle" />
          <dd>{formatEventWhen(event, now)}</dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="sr-only">Where</dt>
          <MapPin size={16} aria-hidden className="mt-0.5 shrink-0 text-foreground-subtle" />
          <dd className="line-clamp-1">{event.venue}</dd>
        </div>
        {crowd && event.attendance !== undefined && (
          <div className="flex items-start gap-2">
            <dt className="sr-only">Expected crowd</dt>
            <Users size={16} aria-hidden className="mt-0.5 shrink-0 text-foreground-subtle" />
            <dd className="flex flex-1 flex-col gap-1.5">
              <span>
                ~{count.format(event.attendance)} expected · <span className="font-medium">{crowd.label}</span>
              </span>
              <Meter value={crowd.percent} aria-label="Expected crowd" className="gap-0">
                <MeterProgress className="h-1" />
              </Meter>
            </dd>
          </div>
        )}
      </dl>

      {event.impact && !crowd && <p className="text-sm text-foreground-muted line-clamp-2">{event.impact}</p>}

      <p className="text-xs text-foreground-muted">Click the point for details</p>
    </div>
  );
}
