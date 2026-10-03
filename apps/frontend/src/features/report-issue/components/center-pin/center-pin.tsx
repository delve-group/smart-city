import { MapPinFilled } from "@appica/icons-react";

/** Pin fixed at the map centre while the user moves the map underneath it. */
export function CenterPin() {
  return (
    <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-full">
      <MapPinFilled size={44} className="text-foreground-intense drop-shadow-sm" />
      <span className="absolute -bottom-1 left-1/2 h-1.5 w-4 -translate-x-1/2 rounded-full bg-foreground-intense/25 blur-xs" />
    </div>
  );
}
