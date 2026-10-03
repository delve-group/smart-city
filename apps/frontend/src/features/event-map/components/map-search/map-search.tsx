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
import type { CityEvent } from "@/api/events/types";
import type { Place } from "@/api/photon/types";
import { usePlaceSearch } from "../../hooks/use-place-search";
import { liveEvents, searchEvents } from "../../utils/search-events";
import { SearchEventOption } from "../search-event-option/search-event-option";
import { SearchPlaceOption } from "../search-place-option/search-place-option";

export type SearchOption =
  | { kind: "event"; id: string; label: string; event: CityEvent }
  | { kind: "place"; id: string; label: string; place: Place };

type OptionGroup = { value: string; items: SearchOption[] };

type MapSearchProps = {
  events: readonly CityEvent[];
  now: number;
  onPick: (option: SearchOption) => void;
};

const toEventOption = (event: CityEvent): SearchOption => ({ kind: "event", id: event.id, label: event.title, event });
const toPlaceOption = (place: Place): SearchOption => ({ kind: "place", id: place.id, label: place.name, place });

export function MapSearch({ events, now, onPick }: MapSearchProps) {
  const [query, setQuery] = useState("");
  const places = usePlaceSearch(query);
  const typed = query.trim().length > 0;

  const groups: OptionGroup[] = typed
    ? [
        { value: "Events", items: searchEvents(events, query, now).map(toEventOption) },
        { value: "Places", items: places.places.map(toPlaceOption) },
      ].filter((group) => group.items.length > 0)
    : [{ value: "Happening now", items: liveEvents(events, now).map(toEventOption) }];

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
        aria-label="Search events and places"
        placeholder="Search events, streets and places"
        className="bg-background shadow-lg"
        startSlot={<Search size={18} aria-hidden className="text-foreground-muted" />}
        endSlot={searchingPlaces ? <Spinner className="size-4 text-foreground-muted" aria-label="Searching places" /> : null}
      />
      <ComboboxContent className="w-(--anchor-width)">
        <ComboboxEmpty>
          {searchingPlaces
            ? "Searching places…"
            : places.status === "error"
              ? "Place search is unavailable right now. Events still work."
              : typed
                ? `No events or places match “${query.trim()}”.`
                : "Nothing is happening right now. Try searching for an event or a street."}
        </ComboboxEmpty>
        <ComboboxList className="max-h-[min(28rem,60dvh)]">
          {(group: OptionGroup) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.value}</ComboboxLabel>
              <ComboboxCollection>
                {(option: SearchOption) => (
                  <ComboboxItem key={`${option.kind}-${option.id}`} value={option}>
                    {option.kind === "event" ? (
                      <SearchEventOption event={option.event} now={now} />
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
