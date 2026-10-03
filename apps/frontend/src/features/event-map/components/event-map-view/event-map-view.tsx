"use client";

import { useMediaQuery } from "@appica/ui-react/hooks/use-media-query";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { CityEvent } from "@/api/events/types";
import { useEvents } from "../../hooks/use-events";
import { useNow } from "../../hooks/use-now";
import type { MapFocus, MapHover } from "../event-map-canvas/event-map-canvas";
import { EventPanel } from "../event-panel/event-panel";
import { EventTooltip } from "../event-tooltip/event-tooltip";
import { EventsStatus } from "../events-status/events-status";
import { MapSearch, type SearchOption } from "../map-search/map-search";

// MapLibre needs the browser (WebGL, window), so the map is client-only.
const EventMapCanvas = dynamic(() => import("../event-map-canvas/event-map-canvas"), { ssr: false });

const DEMO_NOTICE = "Events: demo data";
const EMPTY: CityEvent[] = [];
/** Desktop panel width (25rem) plus its 0.75rem margin. */
const PANEL_INSET = 412;

export function EventMapView() {
  const { state, retry } = useEvents();
  const now = useNow();
  const isDesktop = useMediaQuery("(min-width: 768px)", { defaultValue: true });
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hover, setHover] = useState<MapHover | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const result = state.status === "ready" ? state.result : undefined;
  const events = result?.events ?? EMPTY;
  const selected = events.find((event) => event.id === selectedId);
  const hovered = hover ? events.find((event) => event.id === hover.id) : undefined;

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

  function openEvent(event: CityEvent) {
    setSelectedId(event.id);
    flyTo(event.location, 15.5);
  }

  /** Map click: open the event, and pan only if the panel would cover the point. */
  function selectFromMap(id: string | null, point?: { x: number; y: number }) {
    setSelectedId(id);
    const event = id ? events.find((candidate) => candidate.id === id) : undefined;
    if (!event || !point) return;
    const covered = isDesktop ? point.x > bounds.width - PANEL_INSET - 24 : point.y > bounds.height * 0.28;
    if (covered) flyTo(event.location);
  }

  function handlePick(option: SearchOption) {
    if (option.kind === "event") openEvent(option.event);
    else flyTo(option.place.location, 16);
  }

  return (
    <div ref={containerRef} className="relative size-full overflow-hidden">
      <EventMapCanvas
        events={events}
        selectedId={selectedId}
        hoveredId={hover?.id ?? null}
        focus={focus}
        insets={{
          right: selected && isDesktop ? PANEL_INSET : 0,
          bottom: selected && !isDesktop ? bounds.height * 0.72 : 0,
        }}
        onHover={setHover}
        onSelect={selectFromMap}
        attribution={result?.source === "demo" ? DEMO_NOTICE : undefined}
      />

      <div className="absolute top-3 left-3 z-20 w-[min(24rem,calc(100%-1.5rem))]">
        <MapSearch events={events} now={now} onPick={handlePick} />
      </div>

      {state.status !== "ready" && (
        <div className="absolute inset-x-3 top-18 z-20 flex justify-center md:top-3">
          {state.status === "loading" ? (
            <EventsStatus status="loading" />
          ) : (
            <EventsStatus status="error" message={state.message} onRetry={retry} />
          )}
        </div>
      )}

      {hovered && hover && hovered.id !== selectedId && isDesktop && (
        <EventTooltip key={hovered.id} event={hovered} now={now} x={hover.x} y={hover.y} bounds={bounds} />
      )}

      {selected && (
        <EventPanel
          event={selected}
          events={events}
          now={now}
          onClose={() => setSelectedId(null)}
          onCenter={(event) => flyTo(event.location)}
          onSelect={openEvent}
        />
      )}
    </div>
  );
}
