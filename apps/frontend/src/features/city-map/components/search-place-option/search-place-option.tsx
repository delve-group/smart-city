import { MapPin } from "@appica/icons-react";
import type { Place } from "@/api/photon/types";

export function SearchPlaceOption({ place }: { place: Place }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background-muted text-foreground-muted">
        <MapPin size={18} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-foreground-intense">{place.name}</span>
        {place.detail && <span className="truncate text-xs text-foreground-muted">{place.detail}</span>}
      </span>
    </span>
  );
}
