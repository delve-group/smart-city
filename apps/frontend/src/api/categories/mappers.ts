import type { Category, CategoryDto } from "./types";

export function mapCategoryDto(dto: CategoryDto): Category {
  return { id: dto.id, label: dto.label, description: dto.description };
}
