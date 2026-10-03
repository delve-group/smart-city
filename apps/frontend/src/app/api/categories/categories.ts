import type { CategoryDto } from "@/api/categories/types";

/** DEMO DATA. The category taxonomy a city would manage in its back office. */
export const CATEGORIES: CategoryDto[] = [
  { id: "power", label: "Power & lighting", description: "Power outages, street lights, exposed cables" },
  { id: "water", label: "Water & sewage", description: "Burst pipes, no water, blocked drains, flooding" },
  { id: "roads", label: "Roads & traffic", description: "Potholes, traffic lights, road signs, manholes" },
  { id: "transit", label: "Public transport", description: "Stops, ticket machines, tram and bus disruptions" },
  { id: "waste", label: "Waste & cleanliness", description: "Overflowing bins, illegal dumping, missed collection" },
  { id: "accessibility", label: "Accessibility", description: "Broken lifts, blocked ramps, unsafe pavements" },
  { id: "greenery", label: "Greenery & public space", description: "Fallen trees, playgrounds, benches, parks" },
  { id: "air", label: "Air & noise", description: "Smoke from illegal burning, smells, night-time noise" },
];
