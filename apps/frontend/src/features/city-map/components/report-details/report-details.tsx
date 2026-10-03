import type { CityReport } from "@/api/reports/types";
import { formatDateTime } from "../../utils/format-time";
import { PanelSection } from "../panel-section/panel-section";

export function ReportDetails({ report, now }: { report: CityReport; now: number }) {
  const facts = [
    { label: "Location", value: [report.address, report.district].filter(Boolean).join(", ") },
    { label: "Reported", value: formatDateTime(report.reportedAt, now) },
    { label: "Last update", value: formatDateTime(report.updatedAt, now) },
    { label: "Source", value: report.source === "city" ? "City notice" : "Resident report" },
    { label: "Reference", value: report.reference },
  ];

  return (
    <PanelSection title="Details">
      {report.description && <p className="text-sm leading-relaxed text-pretty text-foreground">{report.description}</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {facts.map((fact) => (
          <div key={fact.label} className="contents">
            <dt className="text-foreground-muted">{fact.label}</dt>
            <dd className="text-foreground-intense">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </PanelSection>
  );
}
