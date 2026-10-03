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

/** Debounced geocoder search; keeps the previous results visible while the next request runs. */
export function usePlaceSearch(query: string): PlaceSearchState {
  const [state, setState] = useState<PlaceSearchState>({ status: "idle", places: [] });
  const trimmed = query.trim();
  const active = trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState((previous) => ({ status: "loading", places: previous.places }));
      searchPlaces(trimmed, controller.signal)
        .then((places) => setState({ status: "done", places }))
        .catch(() => {
          if (!controller.signal.aborted) setState({ status: "error", places: [] });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, active]);

  return active ? state : { status: "idle", places: [] };
}
