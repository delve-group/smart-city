import { useEffect, useState } from "react";
import { searchPublicIncidents } from "@/api/search/search-public-incidents";
import type { PublicSearchPage, SearchMode } from "@/api/search/types";

type SearchState = { key: string; status: "loading" | "ready" | "error"; page: PublicSearchPage | null };

/** Changed query/mode/filter results never survive into a different search. */
export function useIncidentSearch(query: string, mode: SearchMode, categoryIds: readonly string[]) {
  const [state, setState] = useState<SearchState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const trimmed = query.trim();
  const categoryKey = JSON.stringify([...categoryIds].sort());
  const key = JSON.stringify([trimmed, mode, categoryKey, attempt]);
  const active = trimmed.length >= 3 && categoryIds.length > 0;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState({ key, status: "loading", page: null });
      searchPublicIncidents(trimmed, mode, JSON.parse(categoryKey) as string[], controller.signal)
        .then((page) => { if (!controller.signal.aborted) setState({ key, status: "ready", page }); })
        .catch(() => { if (!controller.signal.aborted) setState({ key, status: "error", page: null }); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [active, key, trimmed, mode, categoryKey]);

  return {
    status: !active ? "idle" as const : state?.key === key ? state.status : "loading" as const,
    page: active && state?.key === key ? state.page : null,
    retry: () => setAttempt((value) => value + 1),
  };
}
