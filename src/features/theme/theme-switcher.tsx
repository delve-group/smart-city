"use client";

import { Button } from "@appica/ui-react/button";
import { Toggle } from "@appica/ui-react/toggle";
import { ToggleGroup } from "@appica/ui-react/toggle-group";
import { useTheme } from "@appica/ui-react/hooks/use-theme";
import { APP_THEMES, DEFAULT_THEME, THEME_LABEL } from "./themes";

export function ThemeSwitcher() {
  const { theme, setTheme, mounted } = useTheme();
  // Before mount the stored theme is unknown; render the default to match SSR.
  const current = mounted && theme ? theme : DEFAULT_THEME;

  return (
    <ToggleGroup
      aria-label="Motyw interfejsu"
      value={[current]}
      onValueChange={(value) => {
        if (value[0]) setTheme(value[0]);
      }}
    >
      {APP_THEMES.map((name) => (
        <Toggle
          key={name}
          value={name}
          render={
            <Button variant="ghost" size="md">
              {THEME_LABEL[name]}
            </Button>
          }
        />
      ))}
    </ToggleGroup>
  );
}
