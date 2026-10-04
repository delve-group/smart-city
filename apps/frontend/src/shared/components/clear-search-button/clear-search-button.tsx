"use client";

import { X } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { useI18n } from "@/shared/i18n/locale";

/** Labelled, reachable clear button for search fields (the library's own is 16 px and English-only). */
export function ClearSearchButton({ onClear }: { onClear: () => void }) {
  const { t } = useI18n();
  return (
    <Button variant="ghost" size="icon-sm" aria-label={t("search.clear")} onClick={(event) => {
        // The button unmounts once the field is empty; hand focus back to the field first.
        event.currentTarget.parentElement?.parentElement?.querySelector("input")?.focus();
        onClear();
      }}>
      <X aria-hidden />
    </Button>
  );
}
