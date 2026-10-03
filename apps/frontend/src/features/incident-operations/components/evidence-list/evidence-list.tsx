import { Lock } from "@appica/icons-react";
import { Badge } from "@appica/ui-react/badge";
import type { Evidence, OperationsReport } from "@/api/operations/types";
import { InfoHint } from "@/shared/components/info-hint/info-hint";
import { PanelAccordionItem } from "@/shared/components/panel-accordion-item/panel-accordion-item";
import { formatAgo } from "@/shared/utils/format-time";

const STATE: Record<Evidence["state"], { label: string; variant: "outline" | "warning" | "error" }> = {
  current: { label: "Current", variant: "outline" },
  stale: { label: "Stale", variant: "warning" },
  missing: { label: "Missing", variant: "warning" },
  contradictory: { label: "Contradictory", variant: "error" },
};

type EvidenceListProps = {
  reports: readonly OperationsReport[];
  /** Non-report evidence, e.g. utility observations. Reports come from `reports`. */
  observations: readonly Evidence[];
  now: number;
  onLocate: (report: OperationsReport) => void;
};

/** Everything the incident rests on: resident reports first, then data sources. Missing data is shown, never read as zero. */
export function EvidenceList({ reports, observations, now, onLocate }: EvidenceListProps) {
  const toCheck = observations.filter((item) => item.state !== "current").length;
  const meta = [
    `${reports.length} ${reports.length === 1 ? "report" : "reports"}`,
    observations.length > 0 && `${observations.length} ${observations.length === 1 ? "observation" : "observations"}`,
    toCheck > 0 && `${toCheck} to check`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PanelAccordionItem value="evidence" title="Evidence" meta={meta}>
      <ul className="flex flex-col divide-y divide-border-muted">
        {reports.map((report) => (
          <li key={report.id} className="flex items-start gap-1 py-1 first:pt-0">
            <button
              type="button"
              onClick={() => onLocate(report)}
              className="-mx-2 flex min-w-0 flex-1 flex-col gap-1 rounded-md px-2 py-2 text-start transition-colors outline-none hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <span className="text-sm text-pretty text-foreground">{report.summary}</span>
              <span className="text-xs text-foreground-muted">
                <span className="font-mono">{report.reference}</span> · {report.channel === "voice" ? "Voice" : "Form"} report ·{" "}
                {formatAgo(report.submittedAt, now)}
                {!report.observedAt && " · time observed unknown"}
              </span>
            </button>
            {report.unit && (
              <span className="mt-2">
                <InfoHint label="Private detail" icon={Lock}>
                  {report.unit}. Staff only; never shown on the public map.
                </InfoHint>
              </span>
            )}
          </li>
        ))}
        {observations.map((item) => (
          <li key={item.id} className="flex flex-col gap-1 py-3 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground-intense">{item.label}</span>
              <Badge variant={STATE[item.state].variant} size="xs">
                {STATE[item.state].label}
              </Badge>
            </div>
            <p className="text-xs text-foreground-muted">
              {item.source} · observed {item.observedAt ? formatAgo(item.observedAt, now) : "unknown"} · fetched{" "}
              {formatAgo(item.retrievedAt, now)}
            </p>
            {item.note && <p className="text-xs text-foreground">{item.note}</p>}
          </li>
        ))}
      </ul>
    </PanelAccordionItem>
  );
}
