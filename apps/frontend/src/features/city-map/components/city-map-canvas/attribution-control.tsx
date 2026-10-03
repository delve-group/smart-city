import { AttributionControl as MapLibreAttributionControl } from "maplibre-gl";
import { useEffect } from "react";
import { useControl, type ControlPosition } from "react-map-gl/maplibre";

class UpdatableAttributionControl extends MapLibreAttributionControl {
  setCustomAttribution(customAttribution: string | undefined) {
    this.options = { ...this.options, customAttribution };
    if (this._map) this._updateAttributions();
  }
}

/** Unlike react-map-gl's version, picks up `customAttribution` changes after mount. */
export function AttributionControl({
  position,
  compact,
  customAttribution,
}: {
  position: ControlPosition;
  compact?: boolean;
  customAttribution?: string;
}) {
  const control = useControl(() => new UpdatableAttributionControl({ compact }), { position });

  useEffect(() => {
    control.setCustomAttribution(customAttribution);
  }, [control, customAttribution]);

  return null;
}
