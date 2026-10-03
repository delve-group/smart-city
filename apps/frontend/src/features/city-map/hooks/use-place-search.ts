import { useEffect, useState } from "react";
import { searchPlaces } from "@/api/photon/search-places";
import type { Place } from "@/api/photon/types";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

export type PlaceSearchState =
  | { status: "idle"; places: [] }
  | { status: "loading"; places: Place[] }
  | { status: "done"; places: Place[] }
  | { status: "error"; places: [] };

/** Debounced geocoder search; results belong only to the current query. */
export function usePlaceSearch(query: string) {
  const [state, setState] = useState<PlaceSearchState & { query: string }>({ status: "idle", places: [], query: "" });
  const [attempt, setAttempt] = useState(0);
  const trimmed = query.trim();
  const active = trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState({ status: "loading", places: [], query: trimmed });
      searchPlaces(trimmed, controller.signal)
        .then((places) => { if (!controller.signal.aborted) setState({ status: "done", places, query: trimmed }); })
        .catch(() => {
          if (!controller.signal.aborted) setState({ status: "error", places: [], query: trimmed });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, active, attempt]);

  const current: PlaceSearchState = !active ? { status: "idle", places: [] }
    : state.query === trimmed ? state : { status: "loading", places: [] };
  return { ...current, retry: () => setAttempt((value) => value + 1) };
}
