import { Forms, Lock, Microphone } from "@appica/icons-react";
import { Badge } from "@appica/ui-react/badge";
import type { Evidence, OperationsReport } from "@/api/operations/types";
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
      <ul className="flex flex-col">
        {reports.map((report) => {
          const ChannelIcon = report.channel === "voice" ? Microphone : Forms;
          return (
            <li key={report.id} className="border-b border-border-muted">
              <button
                type="button"
                onClick={() => onLocate(report)}
                className="-mx-2 flex w-[calc(100%+1rem)] flex-col gap-1 rounded-md px-2 py-3 text-start transition-colors outline-none hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <span className="flex items-center gap-2 text-xs text-foreground-muted">
                  <span className="font-mono text-foreground-intense">{report.reference}</span>
                  <span aria-hidden>·</span>
                  <span>{formatAgo(report.submittedAt, now)}</span>
                  {!report.observedAt && <span>· time observed unknown</span>}
                </span>
                <span className="text-sm text-pretty text-foreground">{report.summary}</span>
                <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <ChannelIcon size={14} aria-hidden />
                  {report.channel === "voice" ? "Voice report" : "Form report"}
                  {report.unit && (
                    <>
                      <span aria-hidden>·</span>
                      <Lock size={12} aria-hidden />
                      {report.unit}, staff only
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
        {observations.map((item) => (
          <li key={item.id} className="flex flex-col gap-1 border-b border-border-muted py-3 last:border-0">
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
