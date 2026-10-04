import { Map as MapIcon, Search } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { Input } from "@appica/ui-react/input";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@appica/ui-react/tabs";
import type { Category } from "@/api/categories/types";
import { CategoryFilter } from "@/features/category-filter/components/category-filter/category-filter";
import { AppBrand } from "@/shared/components/app-brand/app-brand";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { QUEUE_TABS, type QueueItem as QueueItemData, type QueueTab } from "../../utils/queue";
import { FreshnessStatus } from "@/shared/components/freshness-status/freshness-status";
import { QueueItem } from "../queue-item/queue-item";
import { ClearSearchButton } from "@/shared/components/clear-search-button/clear-search-button";

const EMPTY: Record<QueueTab, MessageKey> = {
  review: "queue.emptyReview",
  active: "queue.emptyActive",
  done: "queue.emptyDone",
};

type OperationsSidebarProps = {
  queue: Record<QueueTab, QueueItemData[]>;
  tab: QueueTab;
  onTabChange: (tab: QueueTab) => void;
  query: string;
  onQueryChange: (query: string) => void;
  categories: readonly Category[];
  /** Queue rows per category id, before filtering. */
  categoryCounts: ReadonlyMap<string, number>;
  shownCategoryIds: readonly string[];
  /** Some categories are hidden. */
  filtered: boolean;
  onShownCategoriesChange: (ids: string[]) => void;
  selectedKey: string | null;
  onSelect: (item: QueueItemData) => void;
  categoriesById: ReadonlyMap<string, Category>;
  now: number;
  updatedAt: number | null;
  refreshFailed: boolean;
  onRefresh: () => void;
  /** Absent in demo mode, where there is no sign-in. */
  onSignOut?: () => void;
  /** Phones only: switch from the list to the map. */
  onShowMap: () => void;
};

/** The official's work list: what needs a decision, what is being worked on, what is done. */
export function OperationsSidebar({
  queue,
  tab,
  onTabChange,
  query,
  onQueryChange,
  categories,
  categoryCounts,
  shownCategoryIds,
  filtered,
  onShownCategoriesChange,
  selectedKey,
  onSelect,
  categoriesById,
  now,
  updatedAt,
  refreshFailed,
  onRefresh,
  onSignOut,
  onShowMap,
}: OperationsSidebarProps) {
  const { t } = useI18n();
  const items = queue[tab];
  const tabLabel = (value: QueueTab) => t(`queue.${value}` as MessageKey);
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex flex-col gap-4 border-b border-border-muted px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <AppBrand variant="plain" product={t("brand.operator")} />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="md:hidden" onClick={onShowMap}>
              <MapIcon data-icon="start" />
              {t("common.map")}
            </Button>
            {onSignOut && <Button variant="ghost" size="sm" onClick={onSignOut}>{t("common.signOut")}</Button>}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Input
            type="search"
            inputSize="lg"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            endSlot={query ? <ClearSearchButton onClear={() => onQueryChange("")} /> : null}
            placeholder={t("queue.searchPlaceholder")}
            aria-label={t("queue.searchLabel")}
            className="min-w-0 flex-1 border-border-strong/50 [&_input::-webkit-search-cancel-button]:appearance-none bg-background shadow-xs"
            startSlot={<Search size={18} aria-hidden className="text-foreground-muted" />}
          />
          <CategoryFilter
            categories={categories}
            counts={categoryCounts}
            selected={shownCategoryIds}
            onChange={onShownCategoriesChange}
          />
        </div>
        <Tabs value={tab} onValueChange={(next) => onTabChange(next as QueueTab)} variant="line" size="sm">
          <TabsList className="grid w-full grid-cols-3 gap-0">
            {QUEUE_TABS.map((value) => (
              <TabsTrigger key={value} value={value} className="w-full justify-center gap-1.5">
                {tabLabel(value)}
                <span className="text-xs font-normal text-foreground-muted tabular-nums">{queue[value].length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {items.length > 0 ? (
          <ul className="flex flex-col p-2" aria-label={tabLabel(tab)}>
            {items.map((item) => (
              // Hairline between rows, inset to the text; the hover fill covers it.
              <li key={item.key} className="relative not-last:after:absolute not-last:after:inset-x-3 not-last:after:-bottom-px not-last:after:h-px not-last:after:bg-border-muted has-[:hover]:after:opacity-0">
                <QueueItem
                  item={item}
                  category={categoriesById.get(item.kind === "incident" ? item.incident.categoryId : item.report.categoryId)}
                  selected={item.key === selectedKey}
                  now={now}
                  onSelect={() => onSelect(item)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-sm text-pretty text-foreground-muted">
            {query.trim() && filtered
              ? t("filter.noMatchQuery", { query: query.trim() })
              : query.trim()
                ? t("queue.noMatch", { tab: tabLabel(tab), query: query.trim() })
                : filtered
                  ? t("filter.noMatch")
                  : t(EMPTY[tab])}
          </p>
        )}
      </ScrollArea>

      {/* Only when the data on screen may be out of date. */}
      {refreshFailed && (
        <footer className="border-t border-border-muted px-4 py-3">
          <FreshnessStatus updatedAt={updatedAt} onRetry={onRefresh} />
        </footer>
      )}
    </div>
  );
}
