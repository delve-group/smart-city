"use client";

import { Filter } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { Checkbox } from "@appica/ui-react/checkbox";
import { CheckboxGroup } from "@appica/ui-react/checkbox-group";
import { Popover, PopoverContent, PopoverTrigger } from "@appica/ui-react/popover";
import { Separator } from "@appica/ui-react/separator";
import { Switch } from "@appica/ui-react/switch";
import type { Category } from "@/api/categories/types";
import { CategoryTile } from "@/shared/components/category-tile/category-tile";
import { categoryText, useI18n } from "@/shared/i18n/locale";

type CategoryFilterProps = {
  /** API-defined categories; every public incident belongs to exactly one. */
  categories: readonly Category[];
  /** Public incidents per category id, including finished history. */
  counts: ReadonlyMap<string, number>;
  /** Category ids currently shown on the map and in search. */
  selected: readonly string[];
  onChange: (selected: string[]) => void;
  /** Optional switch above the categories that hides resolved and closed items. */
  hideFinished?: boolean;
  onHideFinishedChange?: (hide: boolean) => void;
};

/** Square button next to the search field; opens a category checklist. Disabled until categories load, so it never pops in. */
export function CategoryFilter({ categories, counts, selected, onChange, hideFinished, onHideFinishedChange }: CategoryFilterProps) {
  const { t } = useI18n();
  const allIds = categories.map((category) => category.id);
  const filtered = selected.length < allIds.length;
  const active = filtered || Boolean(hideFinished);
  const label = filtered
    ? t("filter.openCount", { shown: selected.length, total: allIds.length })
    : t("filter.open");

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant={active ? "primary" : "outline"}
            size="icon-lg"
            aria-label={label}
            disabled={allIds.length === 0}
            className={`relative shrink-0 shadow-xs data-disabled:opacity-100! data-disabled:text-foreground-subtle ${active ? "" : "border-border-strong/50"}`}
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
      <PopoverContent align="end" sideOffset={8} aria-label={t("filter.title")} className="w-80 p-2">
        {onHideFinishedChange && (
          <>
            <label className="flex min-h-11 items-center gap-3 rounded-md px-2 text-sm select-none hover:bg-background-muted">
              <span className="flex min-w-0 flex-1 flex-col">
                <span id="category-filter-finished" className="font-medium text-foreground-intense">{t("filter.hideFinished")}</span>
                <span className="truncate text-xs text-foreground-muted">{t("filter.hideFinishedHint")}</span>
              </span>
              <Switch aria-labelledby="category-filter-finished" checked={Boolean(hideFinished)} onCheckedChange={(checked: boolean) => onHideFinishedChange(checked)} />
            </label>
            <Separator className="my-1" />
          </>
        )}
        <CheckboxGroup
          aria-labelledby="category-filter-all"
          allValues={allIds}
          value={[...selected]}
          onValueChange={(value: string[]) => onChange(value)}
          className="gap-0"
        >
          <label className="flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-medium select-none hover:bg-background-muted">
            {/* Base UI renders role="checkbox" on a span, so a wrapping label does not name it. */}
            <Checkbox parent aria-labelledby="category-filter-all" />
            <span id="category-filter-all" className="flex-1 text-foreground-intense">{t("filter.all")}</span>
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
                  {categoryText(t, category).label}
                </span>
                <span className="truncate text-xs text-foreground-muted">{categoryText(t, category).description}</span>
              </span>
              <span className="text-xs text-foreground-muted tabular-nums">{counts.get(category.id) ?? 0}</span>
            </label>
          ))}
        </CheckboxGroup>
        {selected.length === 0 && (
          <p className="mt-2 px-2 text-sm text-foreground-muted">{t("filter.empty")}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
