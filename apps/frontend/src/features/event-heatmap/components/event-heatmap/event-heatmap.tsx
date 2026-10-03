"use client";

import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import dynamic from "next/dynamic";
import { useEvents } from "../../hooks/use-events";

// MapLibre needs the browser (WebGL, window), so the map is client-only.
const HeatmapMap = dynamic(() => import("../heatmap-map/heatmap-map"), { ssr: false });

const DEMO_NOTICE = "Zdarzenia: dane demonstracyjne";

export function EventHeatmap() {
  const { state, retry } = useEvents();
  const result = state.status === "ready" ? state.result : undefined;

  return (
    <div className="relative size-full">
      <HeatmapMap
        events={result?.events ?? []}
        attribution={result?.source === "demo" ? DEMO_NOTICE : undefined}
      />
      {state.status === "error" && (
        <Alert variant="error" className="absolute inset-x-4 top-4 md:inset-x-auto md:start-4 md:max-w-sm">
          <AlertTitle>Nie udało się wczytać zdarzeń</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            {state.message}
            <Button variant="outline" size="sm" onClick={retry}>
              Spróbuj ponownie
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
