"use client";

import { Settings } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { useTheme } from "@appica/ui-react/hooks/use-theme";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@appica/ui-react/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@appica/ui-react/select";
import { Switch } from "@appica/ui-react/switch";
import { useId } from "react";
import { useI18n } from "@/shared/i18n/locale";
import type { Locale } from "@/shared/i18n/messages";

type MapSettingsProps = {
  tilted: boolean;
  onTiltedChange: (tilted: boolean) => void;
};

/** Settings button with view switches: 3D buildings, dark mode and interface language. */
export function MapSettings({ tilted, onTiltedChange }: MapSettingsProps) {
  const { resolvedTheme, setTheme, mounted } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const tiltId = useId();
  const darkId = useId();
  const languageId = useId();
  const languages: { value: Locale; label: string }[] = [
    { value: "en", label: "English" },
    { value: "pl", label: "Polski" },
  ];

  const rows = [
    {
      id: tiltId,
      label: t("settings.buildings"),
      hint: t("settings.buildingsHint"),
      checked: tilted,
      onChange: onTiltedChange,
    },
    {
      id: darkId,
      label: t("settings.dark"),
      hint: t("settings.darkHint"),
      checked: mounted && resolvedTheme === "dark",
      onChange: (dark: boolean) => setTheme(dark ? "dark" : "light"),
    },
  ];

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon-lg"
            aria-label={t("settings.open")}
            className="border-border-strong/50 bg-background shadow-xs"
          />
        }
      >
        <Settings />
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={8} className="w-72">
        <PopoverTitle>{t("settings.title")}</PopoverTitle>
        <div className="mt-2 flex flex-col">
          {rows.map((row) => (
            <label key={row.id} className="flex min-h-14 cursor-pointer items-center gap-3 py-2 select-none">
              <span className="flex min-w-0 flex-1 flex-col">
                {/* Base UI renders role="switch" on a span, so a wrapping label does not name it. */}
                <span id={row.id} className="text-sm font-medium text-foreground-intense">
                  {row.label}
                </span>
                <span className="text-xs text-foreground-muted">{row.hint}</span>
              </span>
              <Switch aria-labelledby={row.id} checked={row.checked} onCheckedChange={row.onChange} />
            </label>
          ))}
          <div className="flex min-h-14 items-center justify-between gap-3 py-2">
            <span id={languageId} className="text-sm font-medium text-foreground-intense">
              {t("settings.language")}
            </span>
            <Select
              items={languages}
              value={locale}
              size="sm"
              onValueChange={(next) => {
                if (next === "en" || next === "pl") setLocale(next);
              }}
            >
              <SelectTrigger aria-labelledby={languageId} className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((language) => (
                  <SelectItem key={language.value} value={language.value}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
