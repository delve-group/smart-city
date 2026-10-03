import type { EventCategory } from "@/api/events/types";
import { CATEGORY_META } from "../../utils/category-meta";

export function CategoryLabel({ category }: { category: EventCategory }) {
  const { label, Icon, textClass } = CATEGORY_META[category];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${textClass}`}>
      <Icon size={14} strokeWidth={2} aria-hidden />
      {label}
    </span>
  );
}
