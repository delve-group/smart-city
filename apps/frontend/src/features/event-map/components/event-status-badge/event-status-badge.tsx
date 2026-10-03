import { Badge } from "@appica/ui-react/badge";
import type { CityEvent } from "@/api/events/types";
import { CATEGORY_META } from "../../utils/category-meta";
import { formatDuration, getEventStatus } from "../../utils/event-status";

type EventStatusBadgeProps = {
  event: Pick<CityEvent, "startsAt" | "endsAt" | "category">;
  now: number;
};

export function EventStatusBadge({ event, now }: EventStatusBadgeProps) {
  const status = getEventStatus(event, now);

  if (status.kind === "ended") {
    return <Badge variant="outline" size="sm">Ended</Badge>;
  }
  if (status.kind === "upcoming") {
    return <Badge variant="soft" size="sm">In {formatDuration(status.startsInMs)}</Badge>;
  }
  return (
    <Badge variant="success" size="sm" className="gap-1.5">
      <span aria-hidden className="relative flex size-1.5">
        <span className="absolute inset-0 rounded-full bg-current opacity-70 animate-ping-paced motion-reduce:animate-none" />
        <span className="relative size-1.5 rounded-full bg-current" />
      </span>
      {CATEGORY_META[event.category].isGathering ? "Live now" : "Active"}
    </Badge>
  );
}
