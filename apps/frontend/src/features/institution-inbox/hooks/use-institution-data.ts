import { useEffect, useEffectEvent, useRef, useState } from "react";
import { getProfile } from "@/api/institution/get-profile";
import { getTickets } from "@/api/institution/get-tickets";
import { InstitutionApiError, type InstitutionProfile, type InstitutionTicket } from "@/api/institution/types";

/** The official and the city may change the incident behind a ticket; 3 s polling aims at the 5 s target. */
const REFRESH_MS = 3_000;

type InboxState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: InstitutionProfile; tickets: InstitutionTicket[] };

const sessionLost = (error: unknown) => error instanceof InstitutionApiError && (error.status === 401 || error.status === 403);

/**
 * Loads the institution's tickets and keeps them fresh while the tab is visible. A failed
 * refresh keeps the last list and says how old it is; it never touches what the operator typed.
 */
export function useInstitutionData(onSessionLost: () => void) {
  const [state, setState] = useState<InboxState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  /** Bumped by every local write, so an older poll response cannot overwrite a newer result. */
  const generation = useRef(0);
  const reportSessionLost = useEffectEvent(onSessionLost);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getProfile(controller.signal), getTickets(controller.signal)])
      .then(([profile, tickets]) => {
        setState({ status: "ready", profile, tickets });
        setUpdatedAt(Date.now());
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (sessionLost(error)) return reportSessionLost();
        setState({ status: "error", message: error instanceof Error ? error.message : "Unknown error." });
      });
    return () => controller.abort();
  }, [attempt]);

  const ready = state.status === "ready";

  async function refresh() {
    const started = generation.current;
    try {
      const tickets = await getTickets();
      if (generation.current !== started) return;
      setState((current) => (current.status === "ready" ? { ...current, tickets } : current));
      setUpdatedAt(Date.now());
      setRefreshFailed(false);
    } catch (error) {
      if (sessionLost(error)) return onSessionLost();
      setRefreshFailed(true);
    }
  }

  /** Hidden tabs do not poll; the next visible tick catches up. */
  const pollWhileVisible = useEffectEvent(() => {
    if (document.visibilityState === "visible") void refresh();
  });

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => pollWhileVisible(), REFRESH_MS);
    return () => clearInterval(id);
  }, [ready]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  /** Applies the ticket returned by an update. */
  function apply(ticket: InstitutionTicket) {
    generation.current += 1;
    setState((current) =>
      current.status === "ready"
        ? { ...current, tickets: current.tickets.map((candidate) => (candidate.id === ticket.id ? ticket : candidate)) }
        : current,
    );
    setUpdatedAt(Date.now());
    setRefreshFailed(false);
  }

  return { state, retry, refresh, apply, updatedAt, refreshFailed };
}
