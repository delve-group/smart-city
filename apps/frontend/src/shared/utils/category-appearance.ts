import { Accessible, Bolt, Bus, Droplet, MapPin, Road, Trash, Trees, Wind, type IconComponent } from "@appica/icons-react";

/** How a category looks. Category ids and labels come from the API; this only styles them. */
export type CategoryAppearance = {
  Icon: IconComponent;
  /** Full class names, so Tailwind can see them. */
  textClass: string;
  tintClass: string;
  /** CSS custom property with the category colour, for map layers. */
  token: string;
};

const KNOWN: Record<string, CategoryAppearance> = {
  power: { Icon: Bolt, textClass: "text-category-power", tintClass: "bg-category-power/12", token: "--category-power" },
  water: { Icon: Droplet, textClass: "text-category-water", tintClass: "bg-category-water/12", token: "--category-water" },
  roads: { Icon: Road, textClass: "text-category-roads", tintClass: "bg-category-roads/12", token: "--category-roads" },
  transit: { Icon: Bus, textClass: "text-category-transit", tintClass: "bg-category-transit/12", token: "--category-transit" },
  waste: { Icon: Trash, textClass: "text-category-waste", tintClass: "bg-category-waste/12", token: "--category-waste" },
  accessibility: { Icon: Accessible, textClass: "text-category-accessibility", tintClass: "bg-category-accessibility/12", token: "--category-accessibility" },
  greenery: { Icon: Trees, textClass: "text-category-greenery", tintClass: "bg-category-greenery/12", token: "--category-greenery" },
  air: { Icon: Wind, textClass: "text-category-air", tintClass: "bg-category-air/12", token: "--category-air" },
};

/** A category the API adds later still renders, in a neutral style, until it gets its own look. */
const FALLBACK: CategoryAppearance = {
  Icon: MapPin,
  textClass: "text-foreground-muted",
  tintClass: "bg-background-muted",
  token: "--foreground-muted",
};

export function categoryAppearance(categoryId: string): CategoryAppearance {
  return KNOWN[categoryId] ?? FALLBACK;
}
