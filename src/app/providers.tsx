"use client";

import { ThemeProvider } from "@appica/ui-react/providers/theme-provider";
import { APP_THEMES, DEFAULT_THEME, THEME_CLASS } from "@/features/theme/themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      themes={[...APP_THEMES]}
      value={THEME_CLASS}
      defaultTheme={DEFAULT_THEME}
      enableSystem={false}
      storageKey="smart-city-theme"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
