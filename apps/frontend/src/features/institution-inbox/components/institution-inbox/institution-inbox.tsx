"use client";

import { ArrowLeft, Map as MapIcon, Search } from "@appica/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { Input } from "@appica/ui-react/input";
import { useMediaQuery } from "@appica/ui-react/hooks/use-media-query";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Spinner } from "@appica/ui-react/spinner";
import { useToastManager } from "@appica/ui-react/toast";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { InstitutionApiError, type InstitutionTicket, type TicketUpdate } from "@/api/institution/types";
import { updateTicket } from "@/api/institution/update-ticket";
import type { MapFocus, MapPoint } from "@/features/city-map/components/city-map-canvas/map-types";
import { CategoryFilter } from "@/features/category-filter/components/category-filter/category-filter";
import { MapSettings } from "@/features/city-map/components/map-settings/map-settings";
import { AppBrand } from "@/shared/components/app-brand/app-brand";
import { FreshnessStatus } from "@/shared/components/freshness-status/freshness-status";
import { useNow } from "@/shared/hooks/use-now";
import { categoryText, useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { useInstitutionData } from "../../hooks/use-institution-data";
import { filterTickets, isOpen, sortTickets } from "../../utils/labels";
import { TicketDetail } from "../ticket-detail/ticket-detail";
import { TicketRow } from "../ticket-row/ticket-row";

// MapLibre needs the browser (WebGL, window), so the map is client-only.
const CityMapCanvas = dynamic(() => import("@/features/city-map/components/city-map-canvas/city-map-canvas"), { ssr: false });

/** Same opening view as the operations workspace. */
const INITIAL_VIEW = { longitude: 19.9425, latitude: 50.0555, zoom: 14.8 };
/** Desktop panel width (25rem) plus its 0.75rem margin. */
const PANEL_INSET = 412;
const STALE_CODES = new Set(["version_conflict", "invalid_state"]);
const SAVED: Record<TicketUpdate["status"], MessageKey> = {
  acknowledged: "inboxSaved.acknowledged",
  in_progress: "inboxSaved.in_progress",
  resolved: "inboxSaved.resolved",
  rejected: "inboxSaved.rejected",
};

type InstitutionInboxProps = { onSessionLost: () => void; onSignOut?: () => void };

/** The institution's assigned tickets beside the map; details open in the same floating panel as /operations. The account decides the institution. */
export function InstitutionInbox({ onSessionLost, onSignOut }: InstitutionInboxProps) {
  const { t } = useI18n();
  const { state, retry, refresh, apply, updatedAt, refreshFailed } = useInstitutionData(onSessionLost);
  const toast = useToastManager();
  const now = useNow();
  const isDesktop = useMediaQuery("(min-width: 768px)", { defaultValue: true });
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Phones show one thing at a time: the list, or the map with the detail sheet. */
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tilted, setTilted] = useState(false);
  const [query, setQuery] = useState("");
  /** Category ids to show; null means all (also covers categories the API adds later). */
  const [shownCategoryIds, setShownCategoryIds] = useState<string[] | null>(null);
  /** Unsaved notes per ticket: polling and failed saves leave them alone. */
  const [notes, setNotes] = useState<Record<string, string>>({});

  const tickets = state.status === "ready" ? state.tickets : [];
  const categories = state.status === "ready" ? state.categories : [];
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const categoryIds = categories.map((category) => category.id);
  const counts = new Map(categoryIds.map((id) => [id, tickets.filter((ticket) => ticket.incident.categoryId === id).length]));
  const shown = filterTickets(tickets, query, shownCategoryIds ? new Set(shownCategoryIds) : null, (id) => {
    const category = categoriesById.get(id);
    return category ? categoryText(t, category).label : undefined;
  });
  const { open, finished } = sortTickets(shown);
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const trimmedQuery = query.trim();
  // The map shows what the list shows; the open ticket always stays. Open tickets stand out, finished ones are smaller.
  const mapped = selected && !shown.includes(selected) ? [...shown, selected] : shown;
  const points: MapPoint[] = mapped.map((ticket) => ({
    id: ticket.id,
    categoryId: ticket.incident.categoryId,
    location: ticket.incident.location,
    weight: isOpen(ticket) ? 0.8 : 0.4,
  }));

  useEffect(() => {
    const element = mapAreaRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setMapHeight(entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Escape closes the detail panel.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  function flyTo(location: { lat: number; lng: number }, zoom = 16) {
    setFocus((previous) => ({ key: (previous?.key ?? 0) + 1, lng: location.lng, lat: location.lat, zoom }));
  }

  function select(ticket: InstitutionTicket) {
    setSelectedId(ticket.id);
    setMobileView("map");
    flyTo(ticket.incident.location);
  }

  async function handleUpdate(ticket: InstitutionTicket, update: TicketUpdate): Promise<boolean> {
    try {
      apply(await updateTicket(ticket.id, update));
      setNotes((current) => ({ ...current, [ticket.id]: "" }));
      toast.add({ title: t(SAVED[update.status]), description: t("inbox.savedBody") });
      return true;
    } catch (error) {
      if (error instanceof InstitutionApiError && (error.status === 401 || error.status === 403)) {
        onSessionLost();
      } else if (error instanceof InstitutionApiError && STALE_CODES.has(error.code)) {
        toast.add({ type: "warning", title: t("inbox.conflictTitle"), description: t("inbox.conflictBody", { message: error.message }) });
        void refresh();
      } else {
        toast.add({ type: "error", title: t("inbox.saveFail"), description: t("inbox.saveFailBody", { message: error instanceof InstitutionApiError ? error.message : t("inbox.unreachable") }) });
      }
      return false;
    }
  }

  const list = (title: string, items: InstitutionTicket[], emptyText: string) => {
    const empty = trimmedQuery && shownCategoryIds
      ? t("filter.noMatchQuery", { query: trimmedQuery })
      : trimmedQuery
        ? t("inbox.noMatch", { section: title, query: trimmedQuery })
        : shownCategoryIds
          ? t("filter.noMatch")
          : emptyText;
    return (
      <section aria-label={title} className="flex flex-col gap-1">
        <h2 className="px-3 pt-3 text-xs font-medium text-foreground-muted">
          {title} <span className="tabular-nums">{items.length}</span>
        </h2>
        {items.length > 0 ? (
          <ul className="flex flex-col">
            {items.map((ticket) => (
              <li key={ticket.id}>
                <TicketRow ticket={ticket} selected={ticket.id === selectedId} now={now} onSelect={() => select(ticket)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-2 text-sm text-pretty text-foreground-muted">{empty}</p>
        )}
      </section>
    );
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <aside
        aria-label={t("inbox.assigned")}
        className={`${mobileView === "list" ? "flex" : "hidden"} w-full shrink-0 flex-col border-e border-border bg-background md:flex md:w-96`}
      >
        <header className="flex flex-col gap-3 border-b border-border-muted px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <AppBrand variant="plain" product={t("brand.institution")} />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="md:hidden" onClick={() => setMobileView("map")}>
                <MapIcon data-icon="start" />
                {t("common.map")}
              </Button>
              {onSignOut && <Button variant="ghost" size="sm" onClick={onSignOut}>{t("common.signOut")}</Button>}
            </div>
          </div>
          {state.status === "ready" && (
            <>
              <p className="text-sm text-foreground">{state.profile.name}</p>
              <div className="flex items-start gap-2">
                <Input
                  type="search"
                  inputSize="lg"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  clearable
                  onClear={() => setQuery("")}
                  placeholder={t("inbox.searchPlaceholder")}
                  aria-label={t("inbox.searchLabel")}
                  className="min-w-0 flex-1 border-border-strong/50 [&_input::-webkit-search-cancel-button]:appearance-none bg-background shadow-xs"
                  startSlot={<Search size={18} aria-hidden className="text-foreground-muted" />}
                />
                {categories.length > 0 && (
                  <CategoryFilter
                    categories={categories}
                    counts={counts}
                    selected={shownCategoryIds ?? categoryIds}
                    onChange={(ids) => setShownCategoryIds(ids.length === categoryIds.length ? null : ids)}
                  />
                )}
              </div>
            </>
          )}
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-2 p-2">
            {state.status === "loading" && (
              <div role="status" className="flex items-center gap-2 px-3 py-4 text-sm text-foreground">
                <Spinner className="size-4 text-foreground-muted" aria-hidden />
                {t("inbox.loading")}
              </div>
            )}
            {state.status === "error" && (
              <Alert variant="error" className="m-2">
                <AlertTitle>{t("inbox.loadError")}</AlertTitle>
                <AlertDescription className="flex flex-col items-start gap-3">
                  {state.message}
                  <Button variant="outline" size="sm" onClick={retry}>{t("common.tryAgain")}</Button>
                </AlertDescription>
              </Alert>
            )}
            {state.status === "ready" && (
              <>
                {list(t("inbox.open"), open, t("inbox.emptyOpen"))}
                {list(t("inbox.finished"), finished, t("inbox.emptyFinished"))}
              </>
            )}
          </div>
        </ScrollArea>
        {/* Only when the list on screen may be out of date. */}
        {refreshFailed && (
          <footer className="border-t border-border-muted px-4 py-3">
            <FreshnessStatus updatedAt={updatedAt} onRetry={() => void refresh()} />
          </footer>
        )}
      </aside>

      <div ref={mapAreaRef} className={`${mobileView === "map" ? "block" : "hidden"} relative min-w-0 flex-1 overflow-hidden md:block`}>
        <CityMapCanvas
          points={points}
          categoryIds={categoryIds}
          selectedIds={selected ? [selected.id] : []}
          hoveredId={hoverId}
          focus={focus}
          insets={{ right: selected && isDesktop ? PANEL_INSET : 0, bottom: selected && !isDesktop ? mapHeight * 0.72 : 0 }}
          interactive
          onHover={(hover) => setHoverId(hover?.id ?? null)}
          onSelect={setSelectedId}
          attribution={state.status === "ready" ? t("demo.tickets") : undefined}
          tilted={tilted}
          areas={[]}
          heatmap={false}
          initialView={INITIAL_VIEW}
        />

        <div className="absolute top-3 left-3 z-20 md:hidden">
          <Button variant="outline" className="border-border-strong/50 bg-background shadow-xs" onClick={() => setMobileView("list")}>
            <ArrowLeft data-icon="start" />
            {t("common.tickets")}
          </Button>
        </div>

        {/* Stays reachable: moves beside the panel on desktop, above the sheet on phones. */}
        <div className={`absolute right-3 bottom-3 z-20 transition-[right,bottom] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${selected ? "bottom-[calc(72dvh+0.75rem)] md:right-[26.25rem] md:bottom-3" : ""}`}>
          <MapSettings tilted={tilted} onTiltedChange={setTilted} />
        </div>

        {selected && (
          <TicketDetail
            ticket={selected}
            now={now}
            category={categoriesById.get(selected.incident.categoryId)}
            note={notes[selected.id] ?? ""}
            onNoteChange={(note) => setNotes((current) => ({ ...current, [selected.id]: note }))}
            onUpdate={(update) => handleUpdate(selected, update)}
            onLocate={() => flyTo(selected.incident.location, 17)}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}
