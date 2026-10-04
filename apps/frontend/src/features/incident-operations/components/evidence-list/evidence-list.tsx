import { Activity, Clock, Id, Lock, Refresh, Server } from "@appica/icons-react";
import { Badge } from "@appica/ui-react/badge";
import type { Evidence, OperationsReport } from "@/api/operations/types";
import { InfoHint } from "@/shared/components/info-hint/info-hint";
import { PanelAccordionItem } from "@/shared/components/panel-accordion-item/panel-accordion-item";
import { tCount, translateServerText, useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { formatAgo } from "@/shared/utils/format-time";
import { Fact, FACTS } from "@/shared/components/fact/fact";

/** Only a problem gets a badge; current data is the norm. */
const PROBLEM: Record<Exclude<Evidence["state"], "current">, { label: MessageKey; variant: "warning" | "error" }> = {
  stale: { label: "evidence.stale", variant: "warning" },
  missing: { label: "evidence.missing", variant: "warning" },
  contradictory: { label: "evidence.contradictory", variant: "error" },
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
  const { t, locale } = useI18n();
  const meta = [
    tCount(t, locale, "countReports", reports.length),
    observations.length > 0 && tCount(t, locale, "countObservations", observations.length),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PanelAccordionItem value="evidence" title={t("evidence.title")} meta={meta}>
      <ul className="flex flex-col divide-y divide-border-muted">
        {reports.map((report) => (
          <li key={report.id} className="flex items-start gap-1 py-1 first:pt-0">
            <button
              type="button"
              onClick={() => onLocate(report)}
              className="-mx-2 flex min-w-0 flex-1 cursor-pointer flex-col gap-1 rounded-md px-2 py-2 text-start transition-colors outline-none hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <span className="text-sm text-pretty text-foreground">{report.summary}</span>
              <span className={FACTS}>
                <Fact icon={Id} label={t("common.reference")}>
                  <span className="font-mono">{report.reference}</span>
                </Fact>
                <Fact icon={Clock} label={t("common.reported")}>
                  {formatAgo(report.submittedAt, now, locale)}
                </Fact>
                {!report.observedAt && <span>{t("evidence.timeUnknown")}</span>}
              </span>
            </button>
            {report.unit && (
              <span className="mt-2">
                <InfoHint label={t("evidence.private")} icon={Lock}>
                  {t("evidence.privateBody", { unit: report.unit })}
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
                <span className="text-sm font-medium text-foreground-intense">{translateServerText(t, item.label)}</span>
                {problem && (
                  <Badge variant={problem.variant} size="xs">
                    {t(problem.label)}
                  </Badge>
                )}
              </div>
              <p className={FACTS}>
                <Fact icon={Server} label={t("common.source")}>
                  {translateServerText(t, item.source)}
                </Fact>
                <Fact icon={Activity} label={t("evidence.observed")}>
                  {item.observedAt ? formatAgo(item.observedAt, now, locale) : t("common.unknown")}
                </Fact>
                <Fact icon={Refresh} label={t("evidence.fetched")}>
                  {formatAgo(item.retrievedAt, now, locale)}
                </Fact>
              </p>
              {item.note && <p className="text-xs text-foreground">{translateServerText(t, item.note)}</p>}
            </li>
          );
        })}
      </ul>
    </PanelAccordionItem>
  );
}
