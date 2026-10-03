"use client";

import { Moon, Sun } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { useTheme } from "@appica/ui-react/hooks/use-theme";

/** Switches between light and dark mode. Until first used, the OS setting decides. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme, mounted } = useTheme();
  const dark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon-lg"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={className}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
