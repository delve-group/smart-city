import { AccordionContent, AccordionItem, AccordionTrigger } from "@appica/ui-react/accordion";
import type { ReactNode } from "react";

type PanelAccordionItemProps = {
  value: string;
  title: string;
  /** Short summary shown next to the title, so a closed section still says what is inside. */
  meta?: ReactNode;
  children: ReactNode;
};

/** A collapsible section of the report panel. Lives inside an Appica `Accordion`. */
export function PanelAccordionItem({ value, title, meta, children }: PanelAccordionItemProps) {
  return (
    // Same look as the static sections: no card border, separators come from the panel.
    <AccordionItem value={value} className="rounded-none border-0 bg-transparent">
      <AccordionTrigger className="py-5 text-sm font-semibold text-foreground-intense">
        <span className="flex flex-1 items-baseline gap-2">
          {title}
          {meta != null && (
            <span className="text-xs font-normal text-foreground-muted tabular-nums">
              <span className="sr-only">, </span>
              {meta}
            </span>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent className="m-0 p-0">
        <div className="flex flex-col gap-3 pb-5">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}
