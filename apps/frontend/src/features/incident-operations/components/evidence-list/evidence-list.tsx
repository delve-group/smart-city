import { Badge } from "@appica/ui-react/badge";
import type { Evidence } from "@/api/operations/types";
import { PanelAccordionItem } from "@/shared/components/panel-accordion-item/panel-accordion-item";
import { formatAgo } from "@/shared/utils/format-time";

const STATE: Record<Evidence["state"], { label: string; variant: "outline" | "warning" | "error" }> = {
  current: { label: "Current", variant: "outline" },
  stale: { label: "Stale", variant: "warning" },
  missing: { label: "Missing", variant: "warning" },
  contradictory: { label: "Contradictory", variant: "error" },
};

/** Every piece of evidence with its source, times and provenance. Missing data is shown, never read as zero. */
export function EvidenceList({ evidence, now }: { evidence: readonly Evidence[]; now: number }) {
  const problems = evidence.filter((item) => item.state !== "current").length;
  return (
    <PanelAccordionItem value="evidence" title="Evidence" meta={problems ? `${evidence.length} · ${problems} to check` : evidence.length}>
      <ul className="flex flex-col gap-3">
        {evidence.map((item) => (
          <li key={item.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground-intense">{item.label}</span>
              <Badge variant={STATE[item.state].variant} size="xs">
                {STATE[item.state].label}
              </Badge>
            </div>
            <p className="text-xs text-foreground-muted">
              {item.source} · {item.provenance === "demo" ? "demo data" : "live"} · observed{" "}
              {item.observedAt ? formatAgo(item.observedAt, now) : "unknown"} · fetched {formatAgo(item.retrievedAt, now)}
            </p>
            {item.note && <p className="text-xs text-foreground">{item.note}</p>}
          </li>
        ))}
      </ul>
    </PanelAccordionItem>
  );
}
