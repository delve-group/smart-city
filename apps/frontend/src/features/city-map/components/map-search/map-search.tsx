"use client";

import { Search } from "@appica/icons-react";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@appica/ui-react/combobox";
import { Spinner } from "@appica/ui-react/spinner";
import { Button } from "@appica/ui-react/button";
import { useState } from "react";
import { useI18n } from "@/shared/i18n/locale";
import type { Category } from "@/api/categories/types";
import type { PublicIncident } from "@/api/incidents/types";
import type { Place } from "@/api/photon/types";
import { USE_MOCKS } from "@/api/mocks/use-mocks";
import { usePlaceSearch } from "../../hooks/use-place-search";
import { useIncidentSearch } from "../../hooks/use-incident-search";
import { searchIncidents, topIncidents } from "../../utils/search-incidents";
import { SearchPlaceOption } from "../search-place-option/search-place-option";
import { SearchIncidentOption } from "../search-incident-option/search-incident-option";
import { incidentSummary } from "../../utils/incident-summary";

export type SearchOption =
  | { kind: "incident"; id: string; label: string; incident: PublicIncident }
  | { kind: "place"; id: string; label: string; place: Place };

type OptionGroup = { value: string; items: SearchOption[] };

type MapSearchProps = {
  /** Only the incidents visible under the current filter are searchable. */
  incidents: readonly PublicIncident[];
  categoryIds: readonly string[];
  categoriesById: ReadonlyMap<string, Category>;
  onPick: (option: SearchOption) => void;
};

const toPlaceOption = (place: Place): SearchOption => ({ kind: "place", id: place.id, label: place.name, place });

export function MapSearch({ incidents, categoryIds, categoriesById, onPick }: MapSearchProps) {
  const { t } = useI18n();
  const toIncidentOption = (incident: PublicIncident): SearchOption => ({ kind: "incident", id: incident.id, label: incidentSummary(t, incident), incident });
  const [query, setQuery] = useState("");
  const places = usePlaceSearch(query);
  const search = useIncidentSearch(query, "hybrid", categoryIds);
  const typed = query.trim().length > 0;
  const incidentsById = new Map(incidents.map((incident) => [incident.id, incident]));
  // Preserve server ordering; details always come from the map's strict public DTO.
  const matches = (search.page?.items ?? []).flatMap((hit) => {
    const incident = incidentsById.get(hit.record_id);
    return incident ? [incident] : [];
  });
  const missingCurrentDetails = search.page?.items.some((hit) => !incidentsById.has(hit.record_id));
  const outdated = search.page?.status === "index_stale" || missingCurrentDetails;
  const fallback = search.status === "error" || outdated || query.trim().length < 3;
  const matchedIds = new Set(matches.map((incident) => incident.id));
  const localMatches = fallback ? searchIncidents(incidents, categoriesById, query, (incident) => incidentSummary(t, incident)).filter((incident) => !matchedIds.has(incident.id)) : [];

  const groups: OptionGroup[] = typed
    ? [
        { value: t("search.reports"), items: matches.map(toIncidentOption) },
        { value: t("search.local"), items: localMatches.map(toIncidentOption) },
        { value: t("search.places"), items: places.places.map(toPlaceOption) },
      ].filter((group) => group.items.length > 0)
    : [{ value: t("search.top"), items: topIncidents(incidents).map(toIncidentOption) }];

  const searchingPlaces = places.status === "loading";
  const searching = searchingPlaces || search.status === "loading";

  return (
    <Combobox
      items={groups}
      filteredItems={groups}
      value={null}
      onValueChange={(option) => {
        if (option) onPick(option as SearchOption);
      }}
      inputValue={query}
      onInputValueChange={setQuery}
      itemToStringLabel={(option) => (option as SearchOption).label}
      isItemEqualToValue={(a, b) => (a as SearchOption).kind === (b as SearchOption).kind && (a as SearchOption).id === (b as SearchOption).id}
      icon={false}
      clearable
      autoHighlight
      size="lg"
    >
      <ComboboxInput
        maxLength={1000}
        aria-label={t("search.label")}
        placeholder={t("search.placeholder")}
        className="border-border-strong/50 bg-background shadow-xs"
        startSlot={<Search size={18} aria-hidden className="text-foreground-muted" />}
        endSlot={searching ? <Spinner className="size-4 text-foreground-muted" aria-label={t("search.searching")} /> : null}
      />
      <ComboboxContent className="w-[min(32rem,calc(100vw-1.5rem))] min-w-0">
        {typed && (searching || search.status === "error" || outdated || places.status === "error" || USE_MOCKS) && <div role="status" className="flex flex-col gap-2 border-b border-border-muted px-3 py-2 text-xs text-foreground-muted">
          {searching && <span>{t("search.searching")}</span>}
          {(search.status === "error" || outdated) && <div className="flex items-center justify-between gap-2">
            <span>{t(search.status === "error" ? "search.incidentsUnavailable" : "search.indexStale")}</span>
            <Button variant="ghost" size="sm" onClick={search.retry}>{t("common.retry")}</Button>
          </div>}
          {places.status === "error" && <div className="flex items-center justify-between gap-2"><span>{t("search.placesUnavailable")}</span><Button variant="ghost" size="sm" onClick={places.retry}>{t("common.retry")}</Button></div>}
          {USE_MOCKS && <span>{t("search.preview")}</span>}
        </div>}
        <ComboboxEmpty>
          {searching
            ? t("search.searching")
            : search.status === "error" || outdated || places.status === "error"
              ? t("search.keepBrowsing")
              : typed
                ? t("search.noMatch", { query: query.trim() })
                : t("search.noReports")}
        </ComboboxEmpty>
        <ComboboxList className="max-h-[min(28rem,60dvh)]">
          {(group: OptionGroup) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.value}</ComboboxLabel>
              <ComboboxCollection>
                {(option: SearchOption) => (
                  <ComboboxItem key={`${option.kind}-${option.id}`} value={option} className="*:min-w-0">
                    {option.kind === "incident" ? (
                      <SearchIncidentOption incident={option.incident} category={categoriesById.get(option.incident.category_id)} />
                    ) : (
                      <SearchPlaceOption place={option.place} />
                    )}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
