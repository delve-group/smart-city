"use client";

import { MessageReport } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { useI18n } from "@/shared/i18n/locale";

/** The app's primary action: report a problem at a place on the map. */
export function ReportFab({ active, busy = false, onClick }: { active: boolean; busy?: boolean; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <Button
      variant={active ? "primary" : "outline"}
      size="lg"
      aria-pressed={active}
      onClick={onClick}
      disabled={busy}
      className={`shrink-0 shadow-xs ${active ? "" : "border-border-strong/50 bg-background"}`}
    >
      <MessageReport data-icon="start" />
      {t("report.fab")}
    </Button>
  );
}
