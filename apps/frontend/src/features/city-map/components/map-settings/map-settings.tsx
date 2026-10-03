"use client";

import { Settings } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { useTheme } from "@appica/ui-react/hooks/use-theme";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@appica/ui-react/popover";
import { Switch } from "@appica/ui-react/switch";
import { useId } from "react";

type MapSettingsProps = {
  tilted: boolean;
  onTiltedChange: (tilted: boolean) => void;
};

/** Settings button with a small pane of view switches: 3D buildings and dark mode. */
export function MapSettings({ tilted, onTiltedChange }: MapSettingsProps) {
  const { resolvedTheme, setTheme, mounted } = useTheme();
  const tiltId = useId();
  const darkId = useId();

  const rows = [
    {
      id: tiltId,
      label: "3D buildings",
      hint: "Tilt the map and raise buildings.",
      checked: tilted,
      onChange: onTiltedChange,
    },
    {
      id: darkId,
      label: "Dark mode",
      hint: "Matches your device by default.",
      checked: mounted && resolvedTheme === "dark",
      onChange: (dark: boolean) => setTheme(dark ? "dark" : "light"),
    },
  ];

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Map settings"
            className="border-border-strong/50 bg-background shadow-xs"
          />
        }
      >
        <Settings />
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={8} className="w-72">
        <PopoverTitle>Map settings</PopoverTitle>
        <div className="mt-2 flex flex-col">
          {rows.map((row) => (
            <label key={row.id} className="flex min-h-14 cursor-pointer items-center gap-3 py-2 select-none">
              <span className="flex min-w-0 flex-1 flex-col">
                {/* Base UI renders role="switch" on a span, so a wrapping label does not name it. */}
                <span id={row.id} className="text-sm font-medium text-foreground-intense">
                  {row.label}
                </span>
                <span className="text-xs text-foreground-muted">{row.hint}</span>
              </span>
              <Switch aria-labelledby={row.id} checked={row.checked} onCheckedChange={row.onChange} />
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
