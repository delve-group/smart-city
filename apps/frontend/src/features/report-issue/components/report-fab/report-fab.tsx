"use client";

import { MessageReport } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { Popover, PopoverContent, PopoverTrigger } from "@appica/ui-react/popover";
import { useState } from "react";
import { useI18n } from "@/shared/i18n/locale";

/** The app's primary action: report a problem at a place on the map. */
export function ReportFab({ active, busy = false, onClick, onVoice }: { active: boolean; busy?: boolean; onClick: () => void; onVoice?: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const button = (
    <Button
      variant={active ? "primary" : "outline"}
      size="lg"
      aria-pressed={active}
      onClick={onVoice && !active ? undefined : onClick}
      disabled={busy}
      className={`shrink-0 shadow-xs ${active ? "" : "border-border-strong/50 bg-background"}`}
    >
      <MessageReport data-icon="start" />
      {t("report.fab")}
    </Button>
  );
  if (!onVoice || active) return button;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger render={button} />
    <PopoverContent align="end" sideOffset={8} aria-label={t("report.create")} className="w-64 p-3">
      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={() => { setOpen(false); onVoice(); }}>{t("voice.title")}</Button>
        <Button variant="outline" size="lg" onClick={() => { setOpen(false); onClick(); }}>{t("voice.useForm")}</Button>
      </div>
    </PopoverContent>
  </Popover>;
}
