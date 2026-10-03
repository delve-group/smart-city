import { useEffect, useState } from "react";
import { getCategories } from "@/api/categories/get-categories";
import type { Category } from "@/api/categories/types";
import { getReports } from "@/api/reports/get-reports";
import type { CityReport, ReportsResult } from "@/api/reports/types";

type CityDataState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; categories: Category[]; result: ReportsResult };

/** Categories first, because every report must belong to a known category. */
export function useCityData() {
  const [state, setState] = useState<CityDataState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getCategories(controller.signal)
      .then(async (categories) => {
        const result = await getReports(new Set(categories.map((category) => category.id)), controller.signal);
        setState({ status: "ready", categories, result });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: error instanceof Error ? error.message : "Unknown error." });
      });
    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  /** Shows a report the user just submitted without reloading everything. */
  function addReport(report: CityReport) {
    setState((current) =>
      current.status === "ready"
        ? { ...current, result: { ...current.result, reports: [report, ...current.result.reports] } }
        : current,
    );
  }

  /** Swaps in a newer version of a report, e.g. after a confirmation. */
  function replaceReport(report: CityReport) {
    setState((current) =>
      current.status === "ready"
        ? {
            ...current,
            result: {
              ...current.result,
              reports: current.result.reports.map((candidate) => (candidate.id === report.id ? report : candidate)),
            },
          }
        : current,
    );
  }

  return { state, retry, addReport, replaceReport };
}
