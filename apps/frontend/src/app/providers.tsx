"use client";

import { ThemeProvider } from "@appica/ui-react/providers/theme-provider";
import { ToastProvider, Toaster } from "@appica/ui-react/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // One theme in light and dark mode; follows the OS until the user picks a mode.
    <ThemeProvider defaultTheme="system" storageKey="smart-city-mode" disableTransitionOnChange>
      <ToastProvider>
        {children}
        <Toaster position="top-center" />
      </ToastProvider>
    </ThemeProvider>
  );
}
