"use client";

import { ThemeProvider } from "@appica/ui-react/providers/theme-provider";
import { ToastProvider, Toaster } from "@appica/ui-react/toast";
import { APP_THEMES, DEFAULT_THEME, THEME_CLASS } from "@/shared/theme/themes";

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
      <ToastProvider>
        {children}
        <Toaster position="top-center" />
      </ToastProvider>
    </ThemeProvider>
  );
}
