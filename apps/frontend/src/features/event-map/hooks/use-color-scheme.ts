import { useSyncExternalStore } from "react";

export type ColorScheme = "light" | "dark";

/** Appica switches themes with the `dark` class on <html>; watch it directly. */
export function useColorScheme(): ColorScheme {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    },
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "light",
  );
}
