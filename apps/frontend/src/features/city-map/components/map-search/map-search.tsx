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
import { useState } from "react";
import type { Category } from "@/api/categories/types";
import type { CityReport } from "@/api/reports/types";
import type { Place } from "@/api/photon/types";
import { usePlaceSearch } from "../../hooks/use-place-search";
import { searchReports, topReports } from "../../utils/search-reports";
import { SearchPlaceOption } from "../search-place-option/search-place-option";
import { SearchReportOption } from "../search-report-option/search-report-option";

export type SearchOption =
  | { kind: "report"; id: string; label: string; report: CityReport }
  | { kind: "place"; id: string; label: string; place: Place };

type OptionGroup = { value: string; items: SearchOption[] };

type MapSearchProps = {
  /** Only the reports visible under the current filter are searchable. */
  reports: readonly CityReport[];
  categoriesById: ReadonlyMap<string, Category>;
  onPick: (option: SearchOption) => void;
};

const toReportOption = (report: CityReport): SearchOption => ({ kind: "report", id: report.id, label: report.title, report });
const toPlaceOption = (place: Place): SearchOption => ({ kind: "place", id: place.id, label: place.name, place });

export function MapSearch({ reports, categoriesById, onPick }: MapSearchProps) {
  const [query, setQuery] = useState("");
  const places = usePlaceSearch(query);
  const typed = query.trim().length > 0;

  const groups: OptionGroup[] = typed
    ? [
        { value: "Reports", items: searchReports(reports, categoriesById, query).map(toReportOption) },
        { value: "Places", items: places.places.map(toPlaceOption) },
      ].filter((group) => group.items.length > 0)
    : [{ value: "Most confirmed", items: topReports(reports).map(toReportOption) }];

  const searchingPlaces = places.status === "loading";

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
      isItemEqualToValue={(a, b) => (a as SearchOption).id === (b as SearchOption).id}
      icon={false}
      clearable
      autoHighlight
      size="lg"
    >
      <ComboboxInput
        aria-label="Search reports and places"
        placeholder="Search reports, streets and places"
        className="bg-background shadow-lg"
        startSlot={<Search size={18} aria-hidden className="text-foreground-muted" />}
        endSlot={searchingPlaces ? <Spinner className="size-4 text-foreground-muted" aria-label="Searching places" /> : null}
      />
      <ComboboxContent className="w-(--anchor-width)">
        <ComboboxEmpty>
          {searchingPlaces
            ? "Searching places…"
            : places.status === "error"
              ? "Place search is unavailable right now. Report search still works."
              : typed
                ? `No reports or places match “${query.trim()}”.`
                : "No open reports. Search for a street to move the map."}
        </ComboboxEmpty>
        <ComboboxList className="max-h-[min(28rem,60dvh)]">
          {(group: OptionGroup) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.value}</ComboboxLabel>
              <ComboboxCollection>
                {(option: SearchOption) => (
                  <ComboboxItem key={`${option.kind}-${option.id}`} value={option}>
                    {option.kind === "report" ? (
                      <SearchReportOption report={option.report} category={categoriesById.get(option.report.categoryId)} />
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
