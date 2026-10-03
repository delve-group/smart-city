import { z } from "zod";

export const EVENT_CATEGORIES = ["culture", "sport", "community", "traffic", "safety"] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** Wire format of a single event. Demo contract until the real events API is known. */
export const eventDtoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.enum(EVENT_CATEGORIES),
  starts_at: z.iso.datetime({ offset: true }),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** Expected number of participants. */
  attendance: z.number().int().nonnegative().optional(),
});

export type EventDto = z.infer<typeof eventDtoSchema>;

/** Envelope is validated strictly; items one by one, so a bad record does not drop the rest. */
export const eventsResponseSchema = z.object({
  source: z.string(),
  events: z.array(z.unknown()),
});

export type EventsResponseDto = { source: string; events: EventDto[] };

export type CityEvent = {
  id: string;
  title: string;
  category: EventCategory;
  /** ISO 8601 with offset. */
  startsAt: string;
  location: { lat: number; lng: number };
  attendance?: number;
};

export type EventsResult = {
  /** "demo" while the endpoint serves mock data. */
  source: string;
  events: CityEvent[];
  /** Records dropped because they did not match the contract. */
  invalidCount: number;
};
