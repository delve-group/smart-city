import type { ReactNode } from "react";

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 py-5">
      <h3 className="text-sm font-semibold text-foreground-intense">{title}</h3>
      {children}
    </section>
  );
}
