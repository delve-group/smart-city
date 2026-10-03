import { Button } from "@appica/ui-react/button";

type TiltToggleProps = {
  tilted: boolean;
  onChange: (tilted: boolean) => void;
};

/** Switches between the flat map and a tilted view with 3D buildings. */
export function TiltToggle({ tilted, onChange }: TiltToggleProps) {
  return (
    <Button
      variant="outline"
      size="icon-lg"
      aria-pressed={tilted}
      aria-label={tilted ? "Show flat map" : "Show buildings in 3D"}
      onClick={() => onChange(!tilted)}
      className="border-border-strong/50 bg-background text-sm font-semibold shadow-xs aria-pressed:bg-background-strong"
    >
      {tilted ? "2D" : "3D"}
    </Button>
  );
}
