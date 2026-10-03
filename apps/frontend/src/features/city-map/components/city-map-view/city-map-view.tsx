"use client";

import { useMediaQuery } from "@appica/ui-react/hooks/use-media-query";
import { useToastManager } from "@appica/ui-react/toast";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/api/categories/types";
import type { LocationPreview } from "@/api/locations/types";
import { addContribution } from "@/api/incidents/add-contribution";
import type { PublicIncident } from "@/api/incidents/types";
import { CategoryFilter } from "@/features/category-filter/components/category-filter/category-filter";
import { CenterPin } from "@/features/report-issue/components/center-pin/center-pin";
import { LocationPicker } from "@/features/report-issue/components/location-picker/location-picker";
import { ReportFab } from "@/features/report-issue/components/report-fab/report-fab";
import { ReportForm } from "@/features/report-issue/components/report-form/report-form";
import { useIntakeDraft } from "@/features/report-issue/hooks/use-intake-draft";
import { VoicePanel } from "@/features/voice/components/voice-panel/voice-panel";
import { insideKrakow } from "@/shared/utils/krakow";
import { AppBrand } from "@/shared/components/app-brand/app-brand";
import { useI18n } from "@/shared/i18n/locale";
import { heatWeight } from "../../utils/heat-weight";
import { useCityData } from "../../hooks/use-city-data";
import { useUserLocation } from "../../hooks/use-user-location";
import { useNow } from "@/shared/hooks/use-now";
import { INITIAL_VIEW, type MapFocus, type MapHover, type MapPoint } from "../city-map-canvas/map-types";
import { DataStatus } from "../data-status/data-status";
import { MapSearch, type SearchOption } from "../map-search/map-search";
import { MapSettings } from "../map-settings/map-settings";
import { IncidentPanel } from "../incident-panel/incident-panel";
import { IncidentTooltip } from "../incident-tooltip/incident-tooltip";
import { FreshnessStatus } from "@/shared/components/freshness-status/freshness-status";

// MapLibre needs the browser (WebGL, window), so the map is client-only.
const CityMapCanvas = dynamic(() => import("../city-map-canvas/city-map-canvas"), { ssr: false });

const NO_INCIDENTS: PublicIncident[] = [];
const NO_CATEGORIES: Category[] = [];
/** Desktop panel width (25rem) plus its 0.75rem margin. */
const PANEL_INSET = 412;

type LatLng = { lat: number; lng: number };

/** Browsing the map, placing the pin for a new report, or filling in the report. */
type Mode = { kind: "browse" } | { kind: "picking" } | { kind: "form" } | { kind: "voice" };

export function CityMapView() {
  const { t } = useI18n();
  const { state, retry, refresh, applyContribution, updatedAt, refreshFailed } = useCityData();
  const intake = useIntakeDraft();
  const toast = useToastManager();
  const now = useNow();
  const userLocation = useUserLocation();
  const isDesktop = useMediaQuery("(min-width: 768px)", { defaultValue: true });
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLElement>(null);
  const [pickerHeight, setPickerHeight] = useState(0);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hover, setHover] = useState<MapHover | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [voiceLocation, setVoiceLocation] = useState<LocationPreview | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "browse" });
  const [center, setCenter] = useState<LatLng>({ lat: INITIAL_VIEW.latitude, lng: INITIAL_VIEW.longitude });
  /** Set when a new report starts placing a pin, so the camera opens on the resident. */
  const placeAtUser = useRef(false);
  /** Category ids to show; null means all (also covers categories the API adds later). */
  const [shownCategoryIds, setShownCategoryIds] = useState<string[] | null>(null);
  const [tilted, setTilted] = useState(false);

  const ready = state.status === "ready" ? state : undefined;
  const categories = ready?.categories ?? NO_CATEGORIES;
  const allIncidents = ready?.incidents ?? NO_INCIDENTS;
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const categoryIds = categories.map((category) => category.id);
  const shownIds = shownCategoryIds ?? categoryIds;
  // The category filter applies to markers, local search, counts and nearby lists.
  const incidents = allIncidents.filter((incident) => shownIds.includes(incident.category_id));
  const points: MapPoint[] = incidents.map((incident) => ({
    id: incident.id, categoryId: incident.category_id, location: incident.public_location, weight: heatWeight(incident),
  }));
  const counts = new Map(categoryIds.map((id) => [id, allIncidents.filter((incident) => incident.category_id === id).length]));
  const selected = incidents.find((incident) => incident.id === selectedId);
  const hovered = hover ? incidents.find((incident) => incident.id === hover.id) : undefined;
  const savedReportId = intake.report?.id;
  useEffect(() => { if (savedReportId) refresh(); }, [savedReportId, refresh]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setBounds({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Keep the phone lockup clear of the actual location-card height.
  useEffect(() => {
    const element = pickerRef.current;
    if (mode.kind !== "picking" || !element) return;
    const observer = new ResizeObserver(([entry]) => setPickerHeight(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, [mode.kind]);

  // Escape closes the detail panel or cancels pin placement; it never discards a half-filled form.
  useEffect(() => {
    if (!selectedId && mode.kind !== "picking" && mode.kind !== "voice") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (mode.kind === "picking" || mode.kind === "voice") setMode({ kind: "browse" });
      else setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, mode.kind]);

  function flyTo(location: { lat: number; lng: number }, zoom?: number) {
    setFocus((previous) => ({ key: (previous?.key ?? 0) + 1, lng: location.lng, lat: location.lat, zoom }));
  }

  function previewVoiceLocation(location: LocationPreview | null) {
    setVoiceLocation(location);
    if (location) setFocus((previous) => ({ key: (previous?.key ?? 0) + 1, ...location, zoom: 17 }));
  }

  // A new report opens on the resident. Dragging the map before the position arrives keeps the current view.
  useEffect(() => {
    if (mode.kind !== "picking") {
      placeAtUser.current = false;
      return;
    }
    if (!placeAtUser.current || !userLocation) return;
    placeAtUser.current = false;
    flyTo(userLocation, 17);
  }, [mode.kind, userLocation]);

  function openIncident(incident: PublicIncident) {
    setSelectedId(incident.id);
    flyTo(incident.public_location, 15.5);
  }

  /** Map click: open the report, and pan only if the panel would cover the point. */
  function selectFromMap(id: string | null, point?: { x: number; y: number }) {
    setSelectedId(id);
    const incident = id ? incidents.find((candidate) => candidate.id === id) : undefined;
    if (!incident || !point) return;
    const covered = isDesktop ? point.x > bounds.width - PANEL_INSET - 24 : point.y > bounds.height * 0.28;
    if (covered) flyTo(incident.public_location);
  }

  function handlePick(option: SearchOption) {
    // While placing a pin, search only moves the map.
    if (option.kind === "incident" && mode.kind === "browse") openIncident(option.incident);
    else flyTo(option.kind === "incident" ? option.incident.public_location : option.place.location, 16.5);
  }

  /** Every report starts from a fresh draft. A failure is a toast; there is nothing to recover. */
  async function startReport() {
    const draft = await intake.start(true);
    if (!draft) {
      toast.add({ type: "error", title: t("intake.startFailed"), description: t("intake.startFailedBody") });
      return;
    }
    setSelectedId(null);
    setHover(null);
    const picking = !(draft.fields.location || draft.submission);
    placeAtUser.current = picking;
    setMode({ kind: picking ? "picking" : "form" });
  }

  function cancelReport() {
    setHover(null);
    setMode({ kind: "browse" });
  }

  async function startVoiceReport() {
    const draft = await intake.start(true, "voice");
    if (!draft) {
      toast.add({ type: "error", title: t("intake.startFailed"), description: t("intake.startFailedBody") });
      return;
    }
    setSelectedId(null); setHover(null);
    setVoiceLocation(null);
    setMode({ kind: "voice" });
  }

  async function handleContribution() {
    if (!selected) return;
    try {
      const result = await addContribution(selected.id);
      applyContribution(result);
      toast.add({ title: t("incidentMap.supportSaved"), description: t("incidentMap.supportHint") });
    } catch (error) {
      refresh();
      throw error;
    }
  }

  const selectedCategory = selected ? categoriesById.get(selected.category_id) : undefined;
  const hoveredCategory = hovered ? categoriesById.get(hovered.category_id) : undefined;

  const sheetCoversMap = (mode.kind === "browse" && Boolean(selected)) || mode.kind === "form";

  return (
    <div ref={containerRef} className="resident-map relative size-full overflow-hidden">
      <CityMapCanvas
        points={points}
        categoryIds={categoryIds}
        selectedIds={selectedId ? [selectedId] : []}
        hoveredId={hover?.id ?? null}
        focus={focus}
        insets={{
          right: selected && isDesktop ? PANEL_INSET : 0,
          bottom: selected && !isDesktop ? bounds.height * 0.72 : 0,
        }}
        draftPin={mode.kind === "form" ? intake.fields.location ?? undefined : undefined}
        locationPreview={mode.kind === "voice" ? voiceLocation : null}
        userLocation={userLocation}
        interactive={mode.kind === "browse"}
        hoverable={mode.kind !== "picking"}
        onHover={setHover}
        onSelect={selectFromMap}
        onCenterChange={setCenter}
        onUserMove={() => { placeAtUser.current = false; }}
        attribution={ready?.incidents.some((incident) => incident.provenance === "demo") ? t("demo.incidents") : undefined}
        tilted={tilted}
      />

      <div className="absolute top-3 right-3 z-20 hidden md:block">
        <AppBrand />
      </div>

      <div
        className={`pointer-events-none absolute left-3 z-20 h-12 items-center transition-[bottom] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none md:hidden ${mode.kind === "voice" ? "hidden" : "flex"} ${sheetCoversMap ? "bottom-[calc(72dvh+0.75rem)]" : "bottom-3"}`}
        style={mode.kind === "picking" && pickerHeight > 0 ? { bottom: `calc(${pickerHeight}px + 1.5rem)` } : undefined}
      ><AppBrand variant="plain" /></div>

      <div className="absolute top-3 right-3 left-3 z-20 flex items-start gap-2 md:right-auto md:w-140">
        <div className="min-w-0 flex-1">
          <MapSearch incidents={incidents} categoryIds={shownIds} categoriesById={categoriesById} onPick={handlePick} />
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
          <ReportFab active={mode.kind !== "browse"} busy={intake.busy} onClick={() => { if (mode.kind === "browse") void startReport(); else if (mode.kind === "voice") cancelReport(); }} onVoice={() => void startVoiceReport()} />
        )}
      </div>


      {ready && refreshFailed && (
        <div className={`absolute left-3 z-20 mb-14 max-w-[calc(100%-1.5rem)] rounded-md border border-border bg-background px-3 py-2 shadow-sm md:bottom-3 md:mb-0 md:max-w-sm ${selected || mode.kind === "form" ? "bottom-[calc(72dvh+0.75rem)]" : mode.kind === "picking" ? "bottom-[calc(50dvh+0.75rem)]" : "bottom-3"}`}>
          <FreshnessStatus updatedAt={updatedAt} onRetry={retry} />
        </div>
      )}

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
            ref={pickerRef}
            pin={center}
            insideCity={insideKrakow(center)}
            onLocate={(location) => flyTo(location, 17)}
            onCancel={cancelReport}
            busy={intake.busy || intake.saving}
            onConfirm={(candidate) => { void intake.chooseLocation(candidate).then((saved) => { if (saved) setMode({ kind: "form" }); }); }}
          />
        </>
      )}

      {mode.kind === "form" && (
        <ReportForm
          categories={categories}
          intake={intake}
          onChangeLocation={() => setMode({ kind: "picking" })}
          onCancel={cancelReport}
          onNew={() => void startReport()}
        />
      )}

      {mode.kind === "voice" && <VoicePanel intake={intake} categories={categories} onLocate={previewVoiceLocation} onClose={cancelReport}
        onFallback={(draft) => setMode({ kind: draft && !draft.submission && !draft.fields.location ? "picking" : "form" })} />}

      {(mode.kind === "browse" || mode.kind === "voice") && ready && (
        // Stays reachable: moves beside the panel on desktop, above the sheet on phones.
        <div className={`absolute right-3 bottom-3 z-20 transition-[right,bottom] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${selected ? "bottom-[calc(72dvh+0.75rem)] md:right-[26.25rem] md:bottom-3" : ""}`}>
          <MapSettings tilted={tilted} onTiltedChange={setTilted} />
        </div>
      )}

      {mode.kind !== "picking" && hovered && hoveredCategory && hover && hovered.id !== selectedId && isDesktop && (
        <IncidentTooltip
          key={hovered.id}
          incident={hovered}
          category={hoveredCategory}
          now={now}
          x={hover.x}
          y={hover.y}
          bounds={{
            width: sheetCoversMap && isDesktop ? Math.max(0, bounds.width - PANEL_INSET) : bounds.width,
            height: bounds.height,
          }}
        />
      )}

      {mode.kind === "browse" && selected && selectedCategory && (
        <IncidentPanel
          key={selected.id}
          incident={selected}
          category={selectedCategory}
          incidents={incidents}
          now={now}
          onClose={() => setSelectedId(null)}
          onCenter={() => flyTo(selected.public_location)}
          onSelect={openIncident}
          onContribute={handleContribution}
        />
      )}
    </div>
  );
}
