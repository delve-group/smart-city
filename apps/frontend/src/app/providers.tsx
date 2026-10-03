"use client";

import { ThemeProvider } from "@appica/ui-react/providers/theme-provider";
import { ToastProvider, Toaster } from "@appica/ui-react/toast";
import { LocaleProvider } from "@/shared/i18n/locale";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // One theme in light and dark mode; follows the OS until the user picks a mode.
    <ThemeProvider defaultTheme="system" storageKey="smart-city-mode" disableTransitionOnChange>
      <LocaleProvider>
        <ToastProvider>
          {children}
          <Toaster position="top-center" />
        </ToastProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
