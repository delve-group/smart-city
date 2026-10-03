import type { ReactNode } from "react";

type FloatingPanelProps = {
  labelledBy: string;
  /** Sticky top area: actions, status, compact title. */
  header: ReactNode;
  children: ReactNode;
};

/**
 * Non-modal surface over the map. Desktop: floating, inset from the right edge, almost
 * full height. Phone: bottom sheet. Content scrolls inside; the header stays put.
 */
export function FloatingPanel({ labelledBy, header, children }: FloatingPanelProps) {
  return (
    <aside
      aria-labelledby={labelledBy}
      className="absolute inset-x-0 bottom-0 z-30 flex h-[72dvh] flex-col overflow-hidden rounded-t-lg border border-border bg-background shadow-md transition-[opacity,translate] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] starting:translate-y-8 starting:opacity-0 motion-reduce:transition-none md:inset-x-auto md:top-3 md:right-3 md:bottom-3 md:h-auto md:w-[25rem] md:rounded-lg md:starting:translate-x-6 md:starting:translate-y-0"
    >
      <header className="relative z-10 border-b border-border-muted bg-background px-5 py-3">{header}</header>
      {children}
    </aside>
  );
}
