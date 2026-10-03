import { BallFootball, HeartHandshake, Palette, ShieldExclamation, TrafficCone, type IconComponent } from "@appica/icons-react";
import type { EventCategory } from "@/api/events/types";

type CategoryMeta = {
  label: string;
  Icon: IconComponent;
  /** Full class names so Tailwind can see them. */
  textClass: string;
  tintClass: string;
  dotClass: string;
  /** Gatherings have an audience; the rest are works and reports. */
  isGathering: boolean;
};

export const CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  culture: {
    label: "Culture",
    Icon: Palette,
    textClass: "text-category-culture",
    tintClass: "bg-category-culture/12",
    dotClass: "bg-category-culture",
    isGathering: true,
  },
  sport: {
    label: "Sport",
    Icon: BallFootball,
    textClass: "text-category-sport",
    tintClass: "bg-category-sport/12",
    dotClass: "bg-category-sport",
    isGathering: true,
  },
  community: {
    label: "Community",
    Icon: HeartHandshake,
    textClass: "text-category-community",
    tintClass: "bg-category-community/12",
    dotClass: "bg-category-community",
    isGathering: true,
  },
  traffic: {
    label: "Road works",
    Icon: TrafficCone,
    textClass: "text-category-traffic",
    tintClass: "bg-category-traffic/12",
    dotClass: "bg-category-traffic",
    isGathering: false,
  },
  safety: {
    label: "Report",
    Icon: ShieldExclamation,
    textClass: "text-category-safety",
    tintClass: "bg-category-safety/12",
    dotClass: "bg-category-safety",
    isGathering: false,
  },
};
