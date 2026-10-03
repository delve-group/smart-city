import { useEffect, useRef, useState } from "react";
import { getCategories } from "@/api/categories/get-categories";
import type { Category } from "@/api/categories/types";
import { getWorkspace } from "@/api/operations/get-workspace";
import type { Workspace } from "@/api/operations/types";

/** Other screens (institutions, other officials) change the data; the spec targets 5 s. */
const REFRESH_MS = 5_000;

type OperationsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; categories: Category[]; workspace: Workspace };

/**
 * Loads the workspace and keeps it fresh. A failed refresh keeps the last good data and
 * reports when it was fetched, so the official can tell the view is stale.
 */
export function useOperationsData() {
  const [state, setState] = useState<OperationsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  /** Bumped by every local write, so an older poll response cannot overwrite a newer result. */
  const generation = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getCategories(controller.signal), getWorkspace(controller.signal)])
      .then(([categories, workspace]) => {
        setState({ status: "ready", categories, workspace });
        setUpdatedAt(Date.now());
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: error instanceof Error ? error.message : "Unknown error." });
      });
    return () => controller.abort();
  }, [attempt]);

  const ready = state.status === "ready";

  async function refresh() {
    const started = generation.current;
    try {
      const workspace = await getWorkspace();
      if (generation.current !== started) return;
      setState((current) => (current.status === "ready" ? { ...current, workspace } : current));
      setUpdatedAt(Date.now());
      setRefreshFailed(false);
    } catch {
      setRefreshFailed(true);
    }
  }

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [ready]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  /** Applies the workspace returned by a command. */
  function apply(workspace: Workspace) {
    generation.current += 1;
    setState((current) => (current.status === "ready" ? { ...current, workspace } : current));
    setUpdatedAt(Date.now());
    setRefreshFailed(false);
  }

  return { state, retry, refresh, apply, updatedAt, refreshFailed };
}
