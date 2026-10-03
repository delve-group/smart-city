import { CurrentLocation, X } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import type { ReactNode } from "react";
import type { Category } from "@/api/categories/types";
import { CategoryLabel } from "@/shared/components/category-label/category-label";

type PanelHeaderProps = {
  category: Category | undefined;
  /** Extra actions before "show on map", e.g. the incident's decision menu. */
  actions?: ReactNode;
  onCenter: () => void;
  onClose: () => void;
};

/** Same header as the resident panel: category on the left, actions on the right. */
export function PanelHeader({ category, actions, onCenter, onClose }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center">{category && <CategoryLabel category={category} />}</div>
      <div className="flex shrink-0 items-center gap-1">
        {actions}
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
