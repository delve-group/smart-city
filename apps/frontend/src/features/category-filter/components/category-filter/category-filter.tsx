"use client";

import { Filter } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { Checkbox } from "@appica/ui-react/checkbox";
import { CheckboxGroup } from "@appica/ui-react/checkbox-group";
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@appica/ui-react/popover";
import type { Category } from "@/api/categories/types";
import { CategoryTile } from "@/shared/components/category-tile/category-tile";

type CategoryFilterProps = {
  /** API-defined categories; every public incident belongs to exactly one. */
  categories: readonly Category[];
  /** Public incidents per category id, including finished history. */
  counts: ReadonlyMap<string, number>;
  /** Category ids currently shown on the map and in search. */
  selected: readonly string[];
  onChange: (selected: string[]) => void;
};

/** Square button next to the search field; opens a category checklist. */
export function CategoryFilter({ categories, counts, selected, onChange }: CategoryFilterProps) {
  const allIds = categories.map((category) => category.id);
  const filtered = selected.length < allIds.length;
  const label = filtered
    ? `Filter categories, ${selected.length} of ${allIds.length} shown`
    : "Filter categories";

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant={filtered ? "primary" : "outline"}
            size="icon-lg"
            aria-label={label}
            className={`relative shrink-0 shadow-xs ${filtered ? "" : "border-border-strong/50"}`}
          />
        }
      >
        <Filter />
        {filtered && (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-foreground-intense px-1 text-xs leading-4 font-semibold text-foreground-inverse ring-2 ring-background tabular-nums"
          >
            {selected.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80">
        <div className="flex flex-col gap-1">
          <PopoverTitle>Show categories</PopoverTitle>
          <PopoverDescription>Hidden categories disappear from the map and from search.</PopoverDescription>
        </div>
        <CheckboxGroup
          aria-labelledby="category-filter-all"
          allValues={allIds}
          value={[...selected]}
          onValueChange={(value: string[]) => onChange(value)}
          className="mt-3 gap-0"
        >
          <label className="flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-medium select-none hover:bg-background-muted">
            {/* Base UI renders role="checkbox" on a span, so a wrapping label does not name it. */}
            <Checkbox parent aria-labelledby="category-filter-all" />
            <span id="category-filter-all" className="flex-1 text-foreground-intense">All categories</span>
            <span className="text-xs text-foreground-muted tabular-nums">
              {[...counts.values()].reduce((sum, count) => sum + count, 0)}
            </span>
          </label>
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex min-h-11 items-center gap-3 rounded-md px-2 text-sm select-none hover:bg-background-muted"
            >
              <Checkbox name={category.id} aria-labelledby={`category-filter-${category.id}`} />
              <CategoryTile categoryId={category.id} size="sm" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span id={`category-filter-${category.id}`} className="truncate text-foreground-intense">
                  {category.label}
                </span>
                <span className="truncate text-xs text-foreground-muted">{category.description}</span>
              </span>
              <span className="text-xs text-foreground-muted tabular-nums">{counts.get(category.id) ?? 0}</span>
            </label>
          ))}
        </CheckboxGroup>
        {selected.length === 0 && (
          <p className="mt-2 px-2 text-sm text-foreground-muted">Nothing is shown. Pick at least one category.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
