import { describe, expect, it } from "vitest";
import type { CityEvent } from "@/api/events/types";
import { toFeatureCollection } from "./to-feature-collection";

const event: CityEvent = {
  id: "e1",
  title: "Koncert",
  category: "culture",
  startsAt: "2026-10-04T18:00:00+02:00",
  location: { lat: 50.0617, lng: 19.9373 },
  attendance: 10_000,
};

describe("toFeatureCollection", () => {
  it("maps events to weighted points in [lng, lat] order", () => {
    expect(toFeatureCollection([event]).features).toEqual([
      {
        type: "Feature",
        id: "e1",
        geometry: { type: "Point", coordinates: [19.9373, 50.0617] },
        properties: { weight: 1 },
      },
    ]);
  });

  it("returns an empty collection for no events", () => {
    expect(toFeatureCollection([]).features).toEqual([]);
  });
});
