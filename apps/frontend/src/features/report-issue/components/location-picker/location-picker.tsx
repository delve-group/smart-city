import { CurrentLocation, MapPin } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import type { ReverseAddress } from "@/api/photon/types";
import type { ReverseGeocodeState } from "../../hooks/use-reverse-geocode";
import { useCurrentLocation } from "../../hooks/use-current-location";

type LocationPickerProps = {
  address: ReverseGeocodeState;
  insideCity: boolean;
  onLocate: (location: { lat: number; lng: number }) => void;
  onCancel: () => void;
  onConfirm: (address: ReverseAddress) => void;
};

/** Bottom card shown while the user moves the map under the centre pin. */
export function LocationPicker({ address, insideCity, onLocate, onCancel, onConfirm }: LocationPickerProps) {
  const location = useCurrentLocation(onLocate);
  const found = address.status === "done" ? address.result : null;

  let line: string;
  if (!insideCity) line = "This spot is outside Kraków. Move the pin into the city.";
  else if (address.status === "done" && found) line = [found.address, found.district].filter(Boolean).join(", ");
  else if (address.status === "error" || (address.status === "done" && !found)) line = "No address found here — the pin location is still saved.";
  else line = "Finding the address…";

  // Without an address we still accept the pin; coordinates are what the crew needs.
  const confirmed: ReverseAddress = found ?? { address: "Pinned location (no street address)" };
  const canConfirm = insideCity && address.status !== "loading" && address.status !== "idle";

  return (
    <section
      aria-labelledby="location-picker-title"
      className="absolute inset-x-3 bottom-3 z-30 flex flex-col gap-4 rounded-lg border border-border bg-background p-5 shadow-md transition-[opacity,translate] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] starting:translate-y-6 starting:opacity-0 motion-reduce:transition-none md:inset-x-auto md:bottom-6 md:left-1/2 md:w-[28rem] md:-translate-x-1/2"
    >
      <div className="flex flex-col gap-1">
        <h2 id="location-picker-title" className="text-lg font-semibold text-foreground-intense">
          Where is the problem?
        </h2>
        <p className="text-sm text-foreground-muted">Move the map so the pin sits on the exact spot.</p>
      </div>

      <p aria-live="polite" className="flex items-start gap-2 rounded-md bg-background-muted p-3 text-sm">
        <MapPin size={18} aria-hidden className={`mt-0.5 shrink-0 ${insideCity ? "text-foreground-muted" : "text-error-emphasis"}`} />
        <span className={insideCity ? "text-foreground-intense" : "text-error-emphasis"}>{line}</span>
      </p>

      {location.state.status === "error" && (
        <p role="alert" className="text-sm text-error-emphasis">{location.state.message}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {location.supported ? (
          <Button variant="ghost" onClick={location.locate} disabled={location.state.status === "locating"}>
            <CurrentLocation data-icon="start" />
            {location.state.status === "locating" ? "Locating…" : "Use my location"}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onConfirm(confirmed)} disabled={!canConfirm}>Confirm location</Button>
        </div>
      </div>
    </section>
  );
}
