import { CalendarClock, MapPin } from "@appica/icons-react";
import type { CityEvent } from "@/api/events/types";
import { formatDuration, getEventStatus } from "../../utils/event-status";
import { formatEventWhen } from "../../utils/format-event-time";
import { PanelSection } from "../panel-section/panel-section";

function relativeLine(event: CityEvent, now: number): string {
  const status = getEventStatus(event, now);
  if (status.kind === "live") return `Happening now · ends in ${formatDuration(status.endsInMs)}`;
  if (status.kind === "upcoming") return `Starts in ${formatDuration(status.startsInMs)}`;
  return "This event has ended";
}

export function EventSchedule({ event, now }: { event: CityEvent; now: number }) {
  return (
    <PanelSection title="When & where">
      <dl className="flex flex-col gap-4 text-sm">
        <div className="flex gap-3">
          <dt className="sr-only">When</dt>
          <CalendarClock size={20} aria-hidden className="shrink-0 text-foreground-subtle" />
          <dd className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground-intense">{formatEventWhen(event, now)}</span>
            <span className="text-foreground-muted">{relativeLine(event, now)}</span>
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="sr-only">Where</dt>
          <MapPin size={20} aria-hidden className="shrink-0 text-foreground-subtle" />
          <dd className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground-intense">{event.venue}</span>
            <span className="text-foreground-muted">{event.address}</span>
          </dd>
        </div>
      </dl>
    </PanelSection>
  );
}
