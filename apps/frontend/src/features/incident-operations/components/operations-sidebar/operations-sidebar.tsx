import { Map as MapIcon, Search } from "@appica/icons-react";
import { Badge } from "@appica/ui-react/badge";
import { Button } from "@appica/ui-react/button";
import { Input } from "@appica/ui-react/input";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@appica/ui-react/tabs";
import type { Category } from "@/api/categories/types";
import { AppBrand } from "@/shared/components/app-brand/app-brand";
import { QUEUE_TABS, TAB_LABEL, type QueueItem as QueueItemData, type QueueTab } from "../../utils/queue";
import { FreshnessStatus } from "../freshness-status/freshness-status";
import { QueueItem } from "../queue-item/queue-item";

const EMPTY: Record<QueueTab, string> = {
  review: "Nothing is waiting for you. New reports and proposals appear here.",
  active: "No institution is working on an incident right now.",
  done: "Resolved and closed incidents appear here.",
};

type OperationsSidebarProps = {
  queue: Record<QueueTab, QueueItemData[]>;
  tab: QueueTab;
  onTabChange: (tab: QueueTab) => void;
  query: string;
  onQueryChange: (query: string) => void;
  selectedKey: string | null;
  onSelect: (item: QueueItemData) => void;
  categoriesById: ReadonlyMap<string, Category>;
  now: number;
  updatedAt: number | null;
  refreshFailed: boolean;
  onRefresh: () => void;
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
  selectedKey,
  onSelect,
  categoriesById,
  now,
  updatedAt,
  refreshFailed,
  onRefresh,
  onShowMap,
}: OperationsSidebarProps) {
  const items = queue[tab];
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex flex-col gap-4 border-b border-border-muted px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <AppBrand variant="plain" />
          <div className="flex items-center gap-2">
            <Badge variant="outline" size="sm">Operations</Badge>
            <Button variant="outline" size="sm" className="md:hidden" onClick={onShowMap}>
              <MapIcon data-icon="start" />
              Map
            </Button>
          </div>
        </div>
        <Input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          clearable
          onClear={() => onQueryChange("")}
          placeholder="Search incidents, reports, tickets"
          aria-label="Search incidents, reports and tickets"
          className="border-border-strong/50 bg-background shadow-xs"
          startSlot={<Search size={18} aria-hidden className="text-foreground-muted" />}
        />
        <Tabs value={tab} onValueChange={(next) => onTabChange(next as QueueTab)} variant="line" size="sm">
          <TabsList className="w-full">
            {QUEUE_TABS.map((value) => (
              <TabsTrigger key={value} value={value} className="flex-1 gap-1.5">
                {TAB_LABEL[value]}
                <span className="text-xs font-normal text-foreground-muted tabular-nums">{queue[value].length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {items.length > 0 ? (
          <ul className="flex flex-col gap-0.5 p-2" aria-label={TAB_LABEL[tab]}>
            {items.map((item) => (
              <li key={item.key}>
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
            {query ? `Nothing in “${TAB_LABEL[tab]}” matches “${query}”.` : EMPTY[tab]}
          </p>
        )}
      </ScrollArea>

      <footer className="flex flex-col gap-2 border-t border-border-muted px-4 py-3">
        <FreshnessStatus updatedAt={updatedAt} failed={refreshFailed} onRetry={onRefresh} />
        <p className="text-xs text-foreground-muted">
          Demo workspace: sample data, fictional institutions, no staff sign-in yet.
        </p>
      </footer>
    </div>
  );
}
