import { Field, FieldError, FieldLabel } from "@appica/ui-react/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@appica/ui-react/select";
import type { Category } from "@/api/categories/types";
import { CategoryTile } from "@/shared/components/category-tile/category-tile";

type CategoryFieldProps = {
  categories: readonly Category[];
  value: string;
  error?: string;
  onChange: (categoryId: string) => void;
};

/** Required: every report belongs to exactly one API-defined category. */
export function CategoryField({ categories, value, error, onChange }: CategoryFieldProps) {
  return (
    <Field invalid={Boolean(error)}>
      <FieldLabel>Category</FieldLabel>
      <Select
        items={categories.map((category) => ({ value: category.id, label: category.label }))}
        value={value || null}
        onValueChange={(next) => onChange(typeof next === "string" ? next : "")}
        size="lg"
      >
        <SelectTrigger>
          <SelectValue placeholder="What kind of problem is it?" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <span className="flex items-center gap-3">
                <CategoryTile categoryId={category.id} size="sm" />
                <span className="flex flex-col">
                  <span>{category.label}</span>
                  <span className="text-xs text-foreground-muted">{category.description}</span>
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError match={Boolean(error)}>{error}</FieldError>
    </Field>
  );
}
