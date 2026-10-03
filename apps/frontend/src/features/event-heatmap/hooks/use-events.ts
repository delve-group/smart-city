import { useEffect, useState } from "react";
import { getEvents } from "@/api/events/get-events";
import type { EventsResult } from "@/api/events/types";

type EventsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; result: EventsResult };

export function useEvents() {
  const [state, setState] = useState<EventsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getEvents(controller.signal)
      .then((result) => setState({ status: "ready", result }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: error instanceof Error ? error.message : "Nieznany błąd." });
      });
    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  return { state, retry };
}
