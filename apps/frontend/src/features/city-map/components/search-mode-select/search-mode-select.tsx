import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@appica/ui-react/select";
import { SEARCH_MODES, type SearchMode } from "@/api/search/types";
import { useI18n } from "@/shared/i18n/locale";

export function SearchModeSelect({ mode, onChange }: { mode: SearchMode; onChange: (mode: SearchMode) => void }) {
  const { t } = useI18n();
  return <Select value={mode} onValueChange={(value) => { if (SEARCH_MODES.includes(value as SearchMode)) onChange(value as SearchMode); }} size="sm"
    items={SEARCH_MODES.map((value) => ({ value, label: t(`search.mode.${value}`) }))}>
    <SelectTrigger aria-label={t("search.modeLabel")} className="w-26 shrink-0 bg-background text-xs shadow-xs">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>{SEARCH_MODES.map((value) => <SelectItem key={value} value={value}>{t(`search.mode.${value}`)}</SelectItem>)}</SelectContent>
  </Select>;
}
