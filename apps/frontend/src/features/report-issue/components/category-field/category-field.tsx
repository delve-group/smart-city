import { Field, FieldError, FieldLabel } from "@appica/ui-react/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@appica/ui-react/select";
import type { Category } from "@/api/categories/types";
import { CategoryTile } from "@/shared/components/category-tile/category-tile";
import { categoryText, useI18n } from "@/shared/i18n/locale";

type CategoryFieldProps = {
  categories: readonly Category[];
  value: string;
  error?: string;
  onChange: (categoryId: string) => void;
  autoFocus?: boolean;
};

/** Required: every report belongs to exactly one API-defined category. */
export function CategoryField({ categories, value, error, onChange, autoFocus = false }: CategoryFieldProps) {
  const { t } = useI18n();
  return (
    <Field invalid={Boolean(error)}>
      <FieldLabel>{t("field.category")}</FieldLabel>
      <Select
        items={categories.map((category) => ({ value: category.id, label: categoryText(t, category).label }))}
        value={value || null}
        onValueChange={(next) => onChange(typeof next === "string" ? next : "")}
        size="lg"
      >
        <SelectTrigger autoFocus={autoFocus}>
          <SelectValue placeholder={t("field.categoryPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => {
            const copy = categoryText(t, category);
            return (
            <SelectItem key={category.id} value={category.id}>
              <span className="flex items-center gap-3">
                <CategoryTile categoryId={category.id} size="sm" />
                <span className="flex flex-col">
                  <span>{copy.label}</span>
                  <span className="text-xs text-foreground-muted">{copy.description}</span>
                </span>
              </span>
            </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <FieldError match={Boolean(error)}>{error}</FieldError>
    </Field>
  );
}
