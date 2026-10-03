import { CurrentLocation, X } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Separator } from "@appica/ui-react/separator";
import { useEffect, useRef } from "react";
import type { CityEvent } from "@/api/events/types";
import { CategoryLabel } from "../category-label/category-label";
import { EventAbout } from "../event-about/event-about";
import { EventCrowd } from "../event-crowd/event-crowd";
import { EventSchedule } from "../event-schedule/event-schedule";
import { EventStatusBadge } from "../event-status-badge/event-status-badge";
import { NearbyEvents } from "../nearby-events/nearby-events";

type EventPanelProps = {
  event: CityEvent;
  events: readonly CityEvent[];
  now: number;
  onClose: () => void;
  onCenter: (event: CityEvent) => void;
  onSelect: (event: CityEvent) => void;
};

/**
 * Non-modal detail panel: the map stays usable behind it.
 * Desktop: floating, inset from the right edge, almost full height. Phone: bottom sheet.
 */
export function EventPanel({ event, events, now, onClose, onCenter, onSelect }: EventPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the new content so keyboard and screen reader users land on it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [event.id]);

  return (
    <aside
      aria-labelledby="event-panel-title"
      className="absolute inset-x-0 bottom-0 z-30 flex h-[72dvh] flex-col overflow-hidden rounded-t-xl border border-border bg-background shadow-xl transition-[opacity,translate] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] starting:translate-y-8 starting:opacity-0 motion-reduce:transition-none md:inset-x-auto md:top-3 md:right-3 md:bottom-3 md:h-auto md:w-[25rem] md:rounded-xl md:starting:translate-x-6 md:starting:translate-y-0"
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-4 md:pt-5">
        <div className="flex items-center gap-2.5">
          <CategoryLabel category={event.category} />
          <EventStatusBadge event={event} now={now} />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-md" aria-label="Show on map" onClick={() => onCenter(event)}>
            <CurrentLocation />
          </Button>
          <Button variant="ghost" size="icon-md" aria-label="Close details" onClick={onClose}>
            <X />
          </Button>
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div
          key={event.id}
          className="flex flex-col px-5 pb-6 transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none"
        >
          <h2
            id="event-panel-title"
            ref={headingRef}
            tabIndex={-1}
            className="pt-3 pb-1 text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground-intense outline-none"
          >
            {event.title}
          </h2>
          <EventSchedule event={event} now={now} />
          <Separator />
          <EventCrowd event={event} />
          <Separator />
          <EventAbout event={event} />
          <Separator />
          <NearbyEvents event={event} events={events} now={now} onSelect={onSelect} />
        </div>
      </ScrollArea>
    </aside>
  );
}
