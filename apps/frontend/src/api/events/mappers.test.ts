import { describe, expect, it } from "vitest";
import { mapEventDto, mapEventsResponse } from "./mappers";
import type { EventDto } from "./types";

const dto: EventDto = {
  id: "e1",
  title: "Koncert",
  category: "culture",
  starts_at: "2026-10-04T18:00:00+02:00",
  lat: 50.0617,
  lng: 19.9373,
  attendance: 500,
};

describe("mapEventDto", () => {
  it("maps the wire format to the app model", () => {
    expect(mapEventDto(dto)).toEqual({
      id: "e1",
      title: "Koncert",
      category: "culture",
      startsAt: "2026-10-04T18:00:00+02:00",
      location: { lat: 50.0617, lng: 19.9373 },
      attendance: 500,
    });
  });
});

describe("mapEventsResponse", () => {
  it("keeps valid records and counts invalid ones", () => {
    const result = mapEventsResponse("demo", [
      dto,
      { ...dto, id: "" },
      { ...dto, category: "unknown" },
      { ...dto, lat: 91 },
      { ...dto, lng: -181 },
      { ...dto, starts_at: "jutro" },
      { ...dto, attendance: -1 },
      { ...dto, attendance: 1.5 },
      null,
    ]);
    expect(result.events).toHaveLength(1);
    expect(result.invalidCount).toBe(8);
    expect(result.source).toBe("demo");
  });

  it("accepts records without optional attendance", () => {
    const withoutAttendance: Partial<EventDto> = { ...dto };
    delete withoutAttendance.attendance;
    expect(mapEventsResponse("demo", [withoutAttendance]).events[0].attendance).toBeUndefined();
  });

  it("returns an empty result for an empty list", () => {
    expect(mapEventsResponse("demo", [])).toEqual({ source: "demo", events: [], invalidCount: 0 });
  });
});
