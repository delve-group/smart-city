import { CurrentLocation, X } from "@appica/icons-react";
import { Accordion } from "@appica/ui-react/accordion";
import { Button } from "@appica/ui-react/button";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Separator } from "@appica/ui-react/separator";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/api/categories/types";
import type { CityReport } from "@/api/reports/types";
import { CategoryLabel } from "@/shared/components/category-label/category-label";
import { useI18n } from "@/shared/i18n/locale";
import { FloatingPanel } from "@/shared/components/floating-panel/floating-panel";
import { NearbyReports } from "../nearby-reports/nearby-reports";
import { ReportDetails } from "../report-details/report-details";
import { ReportImpact } from "../report-impact/report-impact";
import { ReportProgress } from "../report-progress/report-progress";

type ReportPanelProps = {
  report: CityReport;
  category: Category;
  reports: readonly CityReport[];
  now: number;
  onClose: () => void;
  onCenter: (report: CityReport) => void;
  onSelect: (report: CityReport) => void;
  /** This browser already said it is affected by the report. */
  affected: boolean;
  onConfirm: (report: CityReport) => Promise<void>;
};

export function ReportPanel({ report, category, reports, now, onClose, onCenter, onSelect, affected, onConfirm }: ReportPanelProps) {
  const { t } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [titleHidden, setTitleHidden] = useState(false);

  // Move focus to the new content so keyboard and screen reader users land on it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [report.id]);

  // Once the title scrolls away, repeat it in the header so the panel keeps its subject.
  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;
    const observer = new IntersectionObserver(([entry]) => setTitleHidden(!entry.isIntersecting));
    observer.observe(heading);
    return () => observer.disconnect();
  }, [report.id]);

  return (
    <FloatingPanel
      labelledBy="report-panel-title"
      header={
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center">
              <CategoryLabel category={category} />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon-md" aria-label={t("common.showOnMap")} onClick={() => onCenter(report)}>
                <CurrentLocation />
              </Button>
              <Button variant="ghost" size="icon-md" aria-label={t("common.close")} onClick={onClose}>
                <X />
              </Button>
            </div>
          </div>
          {titleHidden && (
            <p aria-hidden className="truncate text-sm font-semibold text-foreground-intense transition-opacity duration-150 starting:opacity-0">
              {report.title}
            </p>
          )}
        </div>
      }
    >
      <ScrollArea className="min-h-0 flex-1">
        <div key={report.id} className="flex flex-col px-5 pb-6 transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none">
          <h2
            id="report-panel-title"
            ref={headingRef}
            tabIndex={-1}
            className="pt-4 pb-1 text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground-intense outline-none"
          >
            {report.title}
          </h2>
          <ReportImpact report={report} affected={affected} onConfirm={() => onConfirm(report)} />
          <Separator />
          <Accordion variant="flush" multiple defaultValue={["progress"]} className="gap-0">
            <ReportProgress report={report} now={now} />
            <Separator />
            <ReportDetails report={report} now={now} />
            <Separator />
            <NearbyReports report={report} reports={reports} category={category} now={now} onSelect={onSelect} />
          </Accordion>
        </div>
      </ScrollArea>
    </FloatingPanel>
  );
}
