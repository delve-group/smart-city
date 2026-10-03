export const APP_THEMES = ["civic", "signal"] as const;

export type AppTheme = (typeof APP_THEMES)[number];

export const DEFAULT_THEME: AppTheme = "civic";

/** Appica UI switches tokens with the `light` / `dark` class on <html>. */
export const THEME_CLASS: Record<AppTheme, string> = {
  civic: "light",
  signal: "dark",
};

export const THEME_LABEL: Record<AppTheme, string> = {
  civic: "Civic",
  signal: "Signal",
};
