"use client";

import { Refresh } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { useNow } from "@/shared/hooks/use-now";
import { useI18n } from "@/shared/i18n/locale";

type FreshnessStatusProps = { updatedAt: number | null; onRetry: () => void };

/** Shown after a failed refresh: how old the data on screen is, and a retry. */
export function FreshnessStatus({ updatedAt, onRetry }: FreshnessStatusProps) {
  const { t } = useI18n();
  const now = useNow(1_000);
  const seconds = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;
  const age = seconds === null ? t("freshness.earlier") : seconds < 60 ? t("freshness.seconds", { count: seconds }) : t("freshness.minutes", { count: Math.round(seconds / 60) });
  return (
    <div role="status" className="flex items-center justify-between gap-2 text-xs text-warning">
      <span>{t("freshness.stale", { age })}</span>
      <Button variant="ghost" size="sm" onClick={onRetry} className="h-7 px-2">
        <Refresh data-icon="start" />
        {t("common.retry")}
      </Button>
    </div>
  );
}
