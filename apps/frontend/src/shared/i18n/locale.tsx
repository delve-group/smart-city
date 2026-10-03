"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  assessmentValueKey,
  fill,
  knownError,
  messages,
  payloadKey,
  pluralForm,
  type Locale,
  type MessageKey,
} from "./messages";

const STORAGE_KEY = "mradar-locale";

export type Translator = (key: MessageKey, vars?: Record<string, string | number>) => string;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "pl" || stored === "en") return stored;
    if (navigator.language.toLowerCase().startsWith("pl")) return "pl";
  } catch {
    // Private mode can block storage; English remains the fallback.
  }
  return "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    // localStorage is unavailable while the page is rendered on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- apply the saved language once, after mount
    setLocaleState(readLocale());
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === "pl" || event.newValue === "en")) setLocaleState(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const apply = () => {
      document.documentElement.lang = locale;
      const titleKey = document.body.dataset.title as MessageKey | undefined;
      if (!titleKey || !(titleKey in messages.en)) return;
      const next = messages[locale][titleKey];
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    const t: Translator = (key, vars) => fill(messages[locale][key], vars);
    return {
      locale,
      setLocale: (next) => {
        setLocaleState(next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // The choice still applies for this tab.
        }
      },
      t,
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useI18n must be used inside LocaleProvider");
  return value;
}

/** Count phrase with English one/other and Polish one/few/many. `base` is the key without the form suffix. */
export function tCount(t: Translator, locale: Locale, base: string, count: number, vars?: Record<string, string | number>): string {
  const form = locale === "pl" ? pluralForm(count) : count === 1 ? "one" : "many";
  return t(`${base}.${form}` as MessageKey, { count, ...vars });
}

export function categoryText(t: Translator, category: { id: string; label: string; description?: string | null }): { label: string; description: string } {
  const labelKey = `category.${category.id}.label`;
  const descriptionKey = `category.${category.id}.description`;
  return {
    label: labelKey in messages.en ? t(labelKey as MessageKey) : category.label,
    description: category.description && descriptionKey in messages.en ? t(descriptionKey as MessageKey) : (category.description ?? ""),
  };
}

export function translateKnown(t: Translator, message: string): string {
  const key = knownError(message);
  return key ? t(key) : message;
}

export function translatePayloadKey(t: Translator, key: string): string {
  const message = payloadKey(key);
  return message ? t(message) : key;
}

export function translateAssessment(t: Translator, value: string): string {
  const message = assessmentValueKey(value);
  return message ? t(message) : value;
}
