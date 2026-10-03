import { Badge } from "@appica/ui-react/badge";
import type { ReportStatus } from "@/api/reports/types";
import { STATUS_LABEL } from "../../utils/report-status";

const VARIANT = {
  reported: "outline",
  confirmed: "soft",
  in_progress: "warning",
  resolved: "success",
} as const satisfies Record<ReportStatus, string>;

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <Badge variant={VARIANT[status]} size="sm" className="gap-1.5">
      {status === "in_progress" && (
        <span aria-hidden className="relative flex size-1.5">
          <span className="absolute inset-0 animate-ping-paced rounded-full bg-current opacity-70 motion-reduce:animate-none" />
          <span className="relative size-1.5 rounded-full bg-current" />
        </span>
      )}
      {STATUS_LABEL[status]}
    </Badge>
  );
}
