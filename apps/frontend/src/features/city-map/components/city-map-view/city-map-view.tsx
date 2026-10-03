"use client";

import { useMediaQuery } from "@appica/ui-react/hooks/use-media-query";
import { useToastManager } from "@appica/ui-react/toast";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/api/categories/types";
import type { ReverseAddress } from "@/api/photon/types";
import { confirmReport } from "@/api/reports/confirm-report";
import { KRAKOW_BOUNDS, type CityReport } from "@/api/reports/types";
import { CategoryFilter } from "@/features/category-filter/components/category-filter/category-filter";
import { CenterPin } from "@/features/report-issue/components/center-pin/center-pin";
import { LocationPicker } from "@/features/report-issue/components/location-picker/location-picker";
import { ReportFab } from "@/features/report-issue/components/report-fab/report-fab";
import { ReportForm } from "@/features/report-issue/components/report-form/report-form";
import { useReverseGeocode } from "@/features/report-issue/hooks/use-reverse-geocode";
import { AppBrand } from "@/shared/components/app-brand/app-brand";
import { useAffectedReports } from "../../hooks/use-affected-reports";
import { useCityData } from "../../hooks/use-city-data";
import { useNow } from "../../hooks/use-now";
import { INITIAL_VIEW, type MapFocus, type MapHover } from "../city-map-canvas/city-map-canvas";
import { DataStatus } from "../data-status/data-status";
import { MapSearch, type SearchOption } from "../map-search/map-search";
import { MapSettings } from "../map-settings/map-settings";
import { ReportPanel } from "../report-panel/report-panel";
import { ReportTooltip } from "../report-tooltip/report-tooltip";

// MapLibre needs the browser (WebGL, window), so the map is client-only.
const CityMapCanvas = dynamic(() => import("../city-map-canvas/city-map-canvas"), { ssr: false });

const DEMO_NOTICE = "Reports: demo data";
const NO_REPORTS: CityReport[] = [];
const NO_CATEGORIES: Category[] = [];
/** Desktop panel width (25rem) plus its 0.75rem margin. */
const PANEL_INSET = 412;

type LatLng = { lat: number; lng: number };

/** Browsing the map, placing the pin for a new report, or filling in the report. */
type Mode = { kind: "browse" } | { kind: "picking" } | { kind: "form"; location: LatLng; address: ReverseAddress };

function insideKrakow({ lat, lng }: LatLng): boolean {
  return lat >= KRAKOW_BOUNDS.south && lat <= KRAKOW_BOUNDS.north && lng >= KRAKOW_BOUNDS.west && lng <= KRAKOW_BOUNDS.east;
}

export function CityMapView() {
  const { state, retry, addReport, replaceReport } = useCityData();
  const { isAffected, markAffected } = useAffectedReports();
  const toast = useToastManager();
  const now = useNow();
  const isDesktop = useMediaQuery("(min-width: 768px)", { defaultValue: true });
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hover, setHover] = useState<MapHover | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "browse" });
  const [center, setCenter] = useState<LatLng>({ lat: INITIAL_VIEW.latitude, lng: INITIAL_VIEW.longitude });
  const pinAddress = useReverseGeocode(mode.kind === "picking" ? center : null);
  /** Category ids to show; null means all (also covers categories the API adds later). */
  const [shownCategoryIds, setShownCategoryIds] = useState<string[] | null>(null);
  const [tilted, setTilted] = useState(false);

  const ready = state.status === "ready" ? state : undefined;
  const categories = ready?.categories ?? NO_CATEGORIES;
  const allReports = ready?.result.reports ?? NO_REPORTS;
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const categoryIds = categories.map((category) => category.id);
  const shownIds = shownCategoryIds ?? categoryIds;
  // Filtered-out reports are neither drawn nor searchable nor listed as nearby.
  const reports = allReports.filter((report) => shownIds.includes(report.categoryId));
  const counts = new Map(categoryIds.map((id) => [id, allReports.filter((report) => report.categoryId === id).length]));

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

  // Escape closes the detail panel or cancels pin placement; it never discards a half-filled form.
  useEffect(() => {
    if (!selectedId && mode.kind !== "picking") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (mode.kind === "picking") setMode({ kind: "browse" });
      else setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, mode.kind]);

  function flyTo(location: { lat: number; lng: number }, zoom?: number) {
    setFocus((previous) => ({ key: (previous?.key ?? 0) + 1, lng: location.lng, lat: location.lat, zoom }));
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
    // While placing a pin, search only moves the map.
    if (option.kind === "report" && mode.kind === "browse") openReport(option.report);
    else flyTo(option.kind === "report" ? option.report.location : option.place.location, 16.5);
  }

  function startReport() {
    setSelectedId(null);
    setHover(null);
    setMode({ kind: "picking" });
  }

  async function handleConfirm(report: CityReport) {
    try {
      replaceReport(await confirmReport(report.id));
      markAffected(report.id);
      toast.add({ title: "Thanks — you are counted", description: "More affected residents move the report up the city's list." });
    } catch (error) {
      toast.add({
        type: "error",
        title: "Could not add you",
        description: error instanceof Error ? error.message : "Try again in a moment.",
      });
    }
  }

  function handleSubmitted(report: CityReport) {
    addReport(report);
    markAffected(report.id);
    // Make sure the new report is visible even if its category was filtered out.
    if (shownCategoryIds && !shownCategoryIds.includes(report.categoryId)) {
      setShownCategoryIds([...shownCategoryIds, report.categoryId]);
    }
    setMode({ kind: "browse" });
    setSelectedId(report.id);
    toast.add({
      title: "Report sent — thank you",
      description: `Reference ${report.reference}. Neighbours can now say they are affected too.`,
    });
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
        draftPin={mode.kind === "form" ? mode.location : undefined}
        interactive={mode.kind === "browse"}
        onHover={setHover}
        onSelect={selectFromMap}
        onCenterChange={setCenter}
        attribution={ready?.result.source === "demo" ? DEMO_NOTICE : undefined}
        tilted={tilted}
      />

      <div className="absolute top-3 right-3 z-20">
        <AppBrand />
      </div>

      <div className="absolute top-16 right-3 left-3 z-20 flex items-start gap-2 md:top-3 md:right-auto md:w-140">
        <div className="min-w-0 flex-1">
          <MapSearch reports={reports} categoriesById={categoriesById} onPick={handlePick} />
        </div>
        {categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            counts={counts}
            selected={shownIds}
            onChange={(ids) => setShownCategoryIds(ids.length === categoryIds.length ? null : ids)}
          />
        )}
        {ready && !selected && (
          <ReportFab active={mode.kind !== "browse"} onClick={() => mode.kind === "browse" && startReport()} />
        )}
      </div>

      {state.status !== "ready" && (
        <div className="absolute inset-x-3 top-30 z-20 flex justify-center md:top-3">
          {state.status === "loading" ? (
            <DataStatus status="loading" />
          ) : (
            <DataStatus status="error" message={state.message} onRetry={retry} />
          )}
        </div>
      )}

      {mode.kind === "picking" && (
        <>
          <CenterPin />
          <LocationPicker
            address={pinAddress}
            insideCity={insideKrakow(center)}
            onLocate={(location) => flyTo(location, 17)}
            onCancel={() => setMode({ kind: "browse" })}
            onConfirm={(address) => setMode({ kind: "form", location: center, address })}
          />
        </>
      )}

      {mode.kind === "form" && (
        <ReportForm
          categories={categories}
          location={mode.location}
          address={mode.address}
          onChangeLocation={() => setMode({ kind: "picking" })}
          onCancel={() => setMode({ kind: "browse" })}
          onSubmitted={handleSubmitted}
        />
      )}

      {mode.kind === "browse" && !selected && ready && (
        <div className="absolute right-3 bottom-3 z-20">
          <MapSettings tilted={tilted} onTiltedChange={setTilted} />
        </div>
      )}

      {mode.kind === "browse" && hovered && hoveredCategory && hover && hovered.id !== selectedId && isDesktop && (
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

      {mode.kind === "browse" && selected && selectedCategory && (
        <ReportPanel
          report={selected}
          category={selectedCategory}
          reports={reports}
          now={now}
          onClose={() => setSelectedId(null)}
          onCenter={(report) => flyTo(report.location)}
          onSelect={openReport}
          affected={isAffected(selected.id)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
