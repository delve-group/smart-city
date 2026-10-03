import { eventDtoSchema, type CityEvent, type EventDto, type EventsResult } from "./types";

export function mapEventDto(dto: EventDto): CityEvent {
  return {
    id: dto.id,
    title: dto.title,
    category: dto.category,
    startsAt: dto.starts_at,
    location: { lat: dto.lat, lng: dto.lng },
    attendance: dto.attendance,
  };
}

/** Keeps valid records and counts invalid ones. */
export function mapEventsResponse(source: string, items: readonly unknown[]): EventsResult {
  const events: CityEvent[] = [];
  let invalidCount = 0;
  for (const item of items) {
    const result = eventDtoSchema.safeParse(item);
    if (result.success) events.push(mapEventDto(result.data));
    else invalidCount++;
  }
  return { source, events, invalidCount };
}
