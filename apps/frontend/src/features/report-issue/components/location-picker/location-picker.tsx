import { CurrentLocation, MapPin } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import type { Ref } from "react";
import { mapPin } from "@/api/locations/mappers";
import type { LocationCandidate } from "@/api/locations/types";
import { useI18n } from "@/shared/i18n/locale";
import { usePinResolution } from "../../hooks/use-pin-resolution";
import { useCurrentLocation } from "../../hooks/use-current-location";

type LocationPickerProps = {
  pin: { lat: number; lng: number };
  busy?: boolean;
  insideCity: boolean;
  onLocate: (location: { lat: number; lng: number }) => void;
  onCancel: () => void;
  onConfirm: (candidate: LocationCandidate) => void;
  ref?: Ref<HTMLElement>;
};

/** Bottom card shown while the user moves the map under the centre pin. */
export function LocationPicker({ pin, busy = false, insideCity, onLocate, onCancel, onConfirm, ref }: LocationPickerProps) {
  const { t } = useI18n();
  const location = useCurrentLocation(onLocate);
  const lookup = usePinResolution(pin);
  const nearby = lookup.status === "done" ? lookup.result.candidates[0] : null;

  let line: string;
  if (!insideCity) line = t("report.outside");
  else if (nearby) line = t("report.pinNear", { label: nearby.label });
  else if (lookup.status === "loading") line = t("report.findingNearby");
  else line = t("report.lookupUnavailable");

  return (
    <section
      ref={ref}
      aria-labelledby="location-picker-title"
      className="absolute inset-x-3 bottom-3 z-30 flex max-h-[calc(50dvh-2rem)] flex-col gap-4 overflow-hidden rounded-lg border border-border bg-background p-5 shadow-md md:inset-x-auto md:bottom-6 md:left-1/2 md:max-h-[75dvh] md:w-[32rem] md:-translate-x-1/2"
    >
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <h2 id="location-picker-title" className="text-lg font-semibold text-foreground-intense">
            {t("report.whereTitle")}
          </h2>
          <p className="text-sm text-foreground-muted">{t("report.whereHint")}</p>
        </div>

        <p aria-live="polite" className="flex items-start gap-2 rounded-md bg-background-muted p-3 text-sm">
          <MapPin size={18} aria-hidden className={`mt-0.5 shrink-0 ${insideCity ? "text-foreground-muted" : "text-error-emphasis"}`} />
          <span className={insideCity ? "text-foreground-intense" : "text-error-emphasis"}>{line}</span>
        </p>

        {location.state.status === "error" && (
          <p role="alert" className="text-sm text-error-emphasis">{location.state.code === "denied" ? t("report.locateDenied") : t("report.locateFailed")}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {location.supported && (
          <Button
            variant="ghost"
            size="lg"
            onClick={location.locate}
            disabled={location.state.status === "locating"}
            className="px-2 text-sm"
          >
            <CurrentLocation data-icon="start" />
            {location.state.status === "locating" ? t("report.locating") : t("report.useLocation")}
          </Button>
        )}
        <div className="ml-auto flex shrink-0 gap-1.5 md:gap-2">
          <Button variant="outline" size="lg" onClick={onCancel} className="px-3 text-sm">
            {t("common.cancel")}
          </Button>
          <Button size="lg" onClick={() => onConfirm(mapPin(pin))} disabled={!insideCity || busy} className="px-3 text-sm">
            {busy ? t("report.savingLocation") : t("report.confirmLocation")}
          </Button>
        </div>
      </div>
    </section>
  );
}
