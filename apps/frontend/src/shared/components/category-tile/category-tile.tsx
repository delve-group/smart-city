import { categoryAppearance } from "../../utils/category-appearance";

/** Tinted square with the category icon; the surrounding text carries the label. */
export function CategoryTile({ categoryId, size = "md" }: { categoryId: string; size?: "sm" | "md" }) {
  const { Icon, textClass, tintClass } = categoryAppearance(categoryId);
  const box = size === "sm" ? "size-7" : "size-9";
  return (
    <span className={`flex ${box} shrink-0 items-center justify-center rounded-md ${tintClass} ${textClass}`}>
      <Icon size={size === "sm" ? 16 : 18} aria-hidden />
    </span>
  );
}
