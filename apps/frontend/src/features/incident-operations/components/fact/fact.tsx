import type { IconComponent } from "@appica/icons-react";
import type { ReactNode } from "react";

type FactProps = {
  icon: IconComponent;
  /** Read by screen readers in place of the icon, e.g. "Distance". */
  label: string;
  children: ReactNode;
};

/** One short fact in a meta line: an icon that names it, then the value. Wrap a row in `FACTS`. */
export function Fact({ icon: Icon, label, children }: FactProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon size={14} aria-hidden className="shrink-0" />
      <span className="sr-only">{label}: </span>
      {children}
    </span>
  );
}

/** Row of facts: muted, small, wraps on narrow panels. */
export const FACTS = "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-muted tabular-nums";
