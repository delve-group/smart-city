"use client";

import { useEffect } from "react";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";

/** Visible name for assistive tech, and the browser title for this screen. */
export function ScreenTitle({ title, heading = title }: { title: MessageKey; heading?: MessageKey }) {
  const { t, locale } = useI18n();
  useEffect(() => {
    document.body.dataset.title = title;
    document.title = t(title);
  }, [title, t, locale]);
  return <h1 className="sr-only">{t(heading)}</h1>;
}
