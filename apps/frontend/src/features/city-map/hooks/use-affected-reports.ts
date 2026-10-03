import { useState } from "react";

const STORAGE_KEY = "smart-city-affected";

function load(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Reports this browser has said "I'm affected too" to (or submitted), so a resident
 * is not counted twice. Per-browser only; a real backend would tie this to an account.
 */
export function useAffectedReports() {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set(typeof window === "undefined" ? [] : load()));

  function markAffected(id: string) {
    setIds((current) => {
      const next = new Set(current).add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Storage can be unavailable (private mode); the session still remembers.
      }
      return next;
    });
  }

  return { isAffected: (id: string) => ids.has(id), markAffected };
}
