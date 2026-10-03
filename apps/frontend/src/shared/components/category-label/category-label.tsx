import type { Category } from "@/api/categories/types";
import { categoryAppearance } from "../../utils/category-appearance";

export function CategoryLabel({ category }: { category: Category }) {
  const { Icon, textClass } = categoryAppearance(category.id);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${textClass}`}>
      <Icon size={14} strokeWidth={2} aria-hidden />
      {category.label}
    </span>
  );
}
