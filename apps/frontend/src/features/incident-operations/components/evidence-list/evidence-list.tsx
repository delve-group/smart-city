import { Activity, Clock, Lock, Refresh, Server } from "@appica/icons-react";
import { Badge } from "@appica/ui-react/badge";
import type { Evidence, OperationsReport } from "@/api/operations/types";
import { InfoHint } from "@/shared/components/info-hint/info-hint";
import { PanelAccordionItem } from "@/shared/components/panel-accordion-item/panel-accordion-item";
import { formatAgo } from "@/shared/utils/format-time";
import { Fact, FACTS } from "../fact/fact";

/** Only a problem gets a badge; current data is the norm. */
const PROBLEM: Record<Exclude<Evidence["state"], "current">, { label: string; variant: "warning" | "error" }> = {
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
  const meta = [
    `${reports.length} ${reports.length === 1 ? "report" : "reports"}`,
    observations.length > 0 && `${observations.length} ${observations.length === 1 ? "observation" : "observations"}`,
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
              <span className={FACTS}>
                <span className="font-mono">{report.reference}</span>
                <Fact icon={Clock} label="Reported">
                  {formatAgo(report.submittedAt, now)}
                </Fact>
                {!report.observedAt && <span>Time observed unknown</span>}
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
        {observations.map((item) => {
          const problem = item.state === "current" ? null : PROBLEM[item.state];
          return (
            <li key={item.id} className="flex flex-col gap-1.5 py-3 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground-intense">{item.label}</span>
                {problem && (
                  <Badge variant={problem.variant} size="xs">
                    {problem.label}
                  </Badge>
                )}
              </div>
              <p className={FACTS}>
                <Fact icon={Server} label="Source">
                  {item.source}
                </Fact>
                <Fact icon={Activity} label="Observed">
                  {item.observedAt ? formatAgo(item.observedAt, now) : "unknown"}
                </Fact>
                <Fact icon={Refresh} label="Fetched">
                  {formatAgo(item.retrievedAt, now)}
                </Fact>
              </p>
              {item.note && <p className="text-xs text-foreground">{item.note}</p>}
            </li>
          );
        })}
      </ul>
    </PanelAccordionItem>
  );
}
