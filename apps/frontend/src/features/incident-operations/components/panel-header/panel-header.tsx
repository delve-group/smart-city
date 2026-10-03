import { CurrentLocation, X } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import type { Category } from "@/api/categories/types";
import { CategoryLabel } from "@/shared/components/category-label/category-label";

type PanelHeaderProps = {
  category: Category | undefined;
  reference: string;
  onCenter: () => void;
  onClose: () => void;
};

/** Same header as the resident panel: category, then the record's reference and actions. */
export function PanelHeader({ category, reference, onCenter, onClose }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {category && <CategoryLabel category={category} />}
        <span className="font-mono text-xs text-foreground-muted">{reference}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon-md" aria-label="Show on map" onClick={onCenter}>
          <CurrentLocation />
        </Button>
        <Button variant="ghost" size="icon-md" aria-label="Close details" onClick={onClose}>
          <X />
        </Button>
      </div>
    </div>
  );
}
