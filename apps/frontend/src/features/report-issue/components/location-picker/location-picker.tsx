import { CurrentLocation, MapPin } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { mapPin } from "@/api/locations/mappers";
import type { LocationCandidate } from "@/api/locations/types";
import { usePinResolution } from "../../hooks/use-pin-resolution";
import { useCurrentLocation } from "../../hooks/use-current-location";
import { AddressSearch } from "../address-search/address-search";

type LocationPickerProps = {
  pin: { lat: number; lng: number };
  selected: LocationCandidate | null;
  insideCity: boolean;
  onLocate: (location: { lat: number; lng: number }) => void;
  onCancel: () => void;
  onSelect: (candidate: LocationCandidate) => void;
  onConfirm: (candidate: LocationCandidate) => void;
};

/** Bottom card shown while the user moves the map under the centre pin. */
export function LocationPicker({ pin, selected, insideCity, onLocate, onSelect, onCancel, onConfirm }: LocationPickerProps) {
  const location = useCurrentLocation(onLocate);
  const lookup = usePinResolution(pin);
  const chosen = selected && Math.abs(selected.lat - pin.lat) < 0.00001 && Math.abs(selected.lng - pin.lng) < 0.00001
    ? selected : null;
  const nearby = lookup.status === "done" ? lookup.result.candidates[0] : null;

  let line: string;
  if (!insideCity) line = "This spot is outside Kraków. Move the pin into the city.";
  else if (chosen) line = `${chosen.label}, Kraków${chosen.building_number ? "" : " — building number unknown"}`;
  else if (nearby) line = `Pin near ${nearby.label}. This nearby address is not confirmed.`;
  else if (lookup.status === "loading") line = "Finding nearby addresses… You can confirm the exact pin now.";
  else line = "Address lookup unavailable or no match — you can confirm the exact pin.";

  return (
    <section
      aria-labelledby="location-picker-title"
      className="absolute inset-x-3 bottom-3 z-30 flex max-h-[75dvh] flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-md md:inset-x-auto md:bottom-6 md:left-1/2 md:w-[32rem] md:-translate-x-1/2"
    >
      <div className="flex flex-col gap-1">
        <h2 id="location-picker-title" className="text-lg font-semibold text-foreground-intense">
          Where is the problem?
        </h2>
        <p className="text-sm text-foreground-muted">Find an address or move the map so the pin sits on the exact spot.</p>
      </div>

      <AddressSearch onSelect={onSelect} />

      <p aria-live="polite" className="flex items-start gap-2 rounded-md bg-background-muted p-3 text-sm">
        <MapPin size={18} aria-hidden className={`mt-0.5 shrink-0 ${insideCity ? "text-foreground-muted" : "text-error-emphasis"}`} />
        <span className={insideCity ? "text-foreground-intense" : "text-error-emphasis"}>{line}</span>
      </p>

      <p className="text-xs text-foreground-muted">
        {chosen ? "Check this location before continuing." : `Exact pin: ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}. Street and building remain unknown.`}
      </p>

      {location.state.status === "error" && (
        <p role="alert" className="text-sm text-error-emphasis">{location.state.message}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {location.supported && (
          <Button
            variant="ghost"
            size="lg"
            onClick={location.locate}
            disabled={location.state.status === "locating"}
            className="px-2 text-sm"
          >
            <CurrentLocation data-icon="start" />
            {location.state.status === "locating" ? "Locating…" : "Use my location"}
          </Button>
        )}
        <div className="ml-auto flex shrink-0 gap-1.5 md:gap-2">
          <Button variant="outline" size="lg" onClick={onCancel} className="px-3 text-sm">
            Cancel
          </Button>
          <Button size="lg" onClick={() => onConfirm(chosen ?? mapPin(pin))} disabled={!insideCity} className="px-3 text-sm">
            Confirm location
          </Button>
        </div>
      </div>
    </section>
  );
}
