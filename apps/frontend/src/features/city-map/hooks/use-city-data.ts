import { useCallback, useEffect, useRef, useState } from "react";
import { getCategories } from "@/api/categories/get-categories";
import type { Category } from "@/api/categories/types";
import { getIncidents } from "@/api/incidents/get-incidents";
import type { Contribution, PublicIncident } from "@/api/incidents/types";

type CityDataState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; categories: Category[]; incidents: PublicIncident[] };

/** Visible-tab polling never resets successful data or owns the resident's unsaved input. */
export function useCityData() {
  const [state, setState] = useState<CityDataState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const generation = useRef(0);
  const refresh = useCallback(() => { generation.current += 1; setAttempt((value) => value + 1); }, []);

  useEffect(() => {
    let stopped = false;
    let loading = false;
    let controller: AbortController | null = null;
    async function load() {
      if (stopped || loading || document.visibilityState !== "visible") return;
      loading = true;
      controller = new AbortController();
      const signal = controller.signal;
      const started = generation.current;
      try {
        const [categories, incidents] = await Promise.all([getCategories(signal), getIncidents(signal)]);
        if (stopped || signal.aborted || started !== generation.current) return;
        const known = new Set(categories.map((category) => category.id));
        if (incidents.some((incident) => !known.has(incident.category_id))) throw new Error("Incident catalogue changed. Retry loading the map.");
        setState({ status: "ready", categories, incidents });
        setUpdatedAt(Date.now()); setRefreshFailed(false);
      } catch (failure) {
        if (stopped || signal.aborted || started !== generation.current) return;
        setRefreshFailed(true);
        setState((current) => current.status === "ready" ? current : { status: "error", message: failure instanceof Error ? failure.message : "Could not load public incidents." });
      } finally { loading = false; }
    }
    void load();
    const timer = setInterval(() => void load(), 3_000);
    const visibility = () => { if (document.visibilityState !== "visible") controller?.abort(); else void load(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { stopped = true; controller?.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [attempt]);

  function applyContribution(result: Contribution) {
    generation.current += 1;
    setState((current) => current.status !== "ready" ? current : { ...current,
      incidents: current.incidents.map((incident) => incident.id === result.incident_id ? { ...incident, viewer_support: result.membership, support_count: result.support_count, assessment: result.assessment } : incident),
    });
    refresh();
  }
  return { state, retry: refresh, refresh, applyContribution, updatedAt, refreshFailed };
}
