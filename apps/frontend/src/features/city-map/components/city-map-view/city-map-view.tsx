"use client";

import { useMediaQuery } from "@appica/ui-react/hooks/use-media-query";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/api/categories/types";
import type { CityReport } from "@/api/reports/types";
import { useCityData } from "../../hooks/use-city-data";
import { useNow } from "../../hooks/use-now";
import type { MapFocus, MapHover } from "../city-map-canvas/city-map-canvas";
import { DataStatus } from "../data-status/data-status";
import { MapSearch, type SearchOption } from "../map-search/map-search";
import { ReportPanel } from "../report-panel/report-panel";
import { ReportTooltip } from "../report-tooltip/report-tooltip";

// MapLibre needs the browser (WebGL, window), so the map is client-only.
const CityMapCanvas = dynamic(() => import("../city-map-canvas/city-map-canvas"), { ssr: false });

const DEMO_NOTICE = "Reports: demo data";
const NO_REPORTS: CityReport[] = [];
const NO_CATEGORIES: Category[] = [];
/** Desktop panel width (25rem) plus its 0.75rem margin. */
const PANEL_INSET = 412;

export function CityMapView() {
  const { state, retry } = useCityData();
  const now = useNow();
  const isDesktop = useMediaQuery("(min-width: 768px)", { defaultValue: true });
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hover, setHover] = useState<MapHover | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const ready = state.status === "ready" ? state : undefined;
  const categories = ready?.categories ?? NO_CATEGORIES;
  const reports = ready?.result.reports ?? NO_REPORTS;
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const categoryIds = categories.map((category) => category.id);

  const selected = reports.find((report) => report.id === selectedId);
  const hovered = hover ? reports.find((report) => report.id === hover.id) : undefined;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setBounds({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  function flyTo(location: { lat: number; lng: number }, zoom?: number) {
    setFocus({ key: Date.now(), lng: location.lng, lat: location.lat, zoom });
  }

  function openReport(report: CityReport) {
    setSelectedId(report.id);
    flyTo(report.location, 15.5);
  }

  /** Map click: open the report, and pan only if the panel would cover the point. */
  function selectFromMap(id: string | null, point?: { x: number; y: number }) {
    setSelectedId(id);
    const report = id ? reports.find((candidate) => candidate.id === id) : undefined;
    if (!report || !point) return;
    const covered = isDesktop ? point.x > bounds.width - PANEL_INSET - 24 : point.y > bounds.height * 0.28;
    if (covered) flyTo(report.location);
  }

  function handlePick(option: SearchOption) {
    if (option.kind === "report") openReport(option.report);
    else flyTo(option.place.location, 16);
  }

  const selectedCategory = selected ? categoriesById.get(selected.categoryId) : undefined;
  const hoveredCategory = hovered ? categoriesById.get(hovered.categoryId) : undefined;

  return (
    <div ref={containerRef} className="relative size-full overflow-hidden">
      <CityMapCanvas
        reports={reports}
        categoryIds={categoryIds}
        selectedId={selectedId}
        hoveredId={hover?.id ?? null}
        focus={focus}
        insets={{
          right: selected && isDesktop ? PANEL_INSET : 0,
          bottom: selected && !isDesktop ? bounds.height * 0.72 : 0,
        }}
        interactive
        onHover={setHover}
        onSelect={selectFromMap}
        attribution={ready?.result.source === "demo" ? DEMO_NOTICE : undefined}
      />

      <div className="absolute top-3 left-3 z-20 w-[min(24rem,calc(100%-1.5rem))]">
        <MapSearch reports={reports} categoriesById={categoriesById} onPick={handlePick} />
      </div>

      {state.status !== "ready" && (
        <div className="absolute inset-x-3 top-18 z-20 flex justify-center md:top-3">
          {state.status === "loading" ? (
            <DataStatus status="loading" />
          ) : (
            <DataStatus status="error" message={state.message} onRetry={retry} />
          )}
        </div>
      )}

      {hovered && hoveredCategory && hover && hovered.id !== selectedId && isDesktop && (
        <ReportTooltip
          key={hovered.id}
          report={hovered}
          category={hoveredCategory}
          now={now}
          x={hover.x}
          y={hover.y}
          bounds={bounds}
        />
      )}

      {selected && selectedCategory && (
        <ReportPanel
          report={selected}
          category={selectedCategory}
          reports={reports}
          now={now}
          onClose={() => setSelectedId(null)}
          onCenter={(report) => flyTo(report.location)}
          onSelect={openReport}
        />
      )}
    </div>
  );
}
