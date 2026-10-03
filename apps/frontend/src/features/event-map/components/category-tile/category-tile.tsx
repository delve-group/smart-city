import type { EventCategory } from "@/api/events/types";
import { CATEGORY_META } from "../../utils/category-meta";

/** Tinted square with the category icon; the label is given by the surrounding text. */
export function CategoryTile({ category }: { category: EventCategory }) {
  const { Icon, textClass, tintClass } = CATEGORY_META[category];
  return (
    <span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${tintClass} ${textClass}`}>
      <Icon size={18} aria-hidden />
    </span>
  );
}
