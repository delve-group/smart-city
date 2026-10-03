import { z } from "zod";

export const EVENT_CATEGORIES = ["culture", "sport", "community", "traffic", "safety"] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** Wire format of a single event. Demo contract until the real events API is known. */
export const eventDtoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.enum(EVENT_CATEGORIES),
  starts_at: z.iso.datetime({ offset: true }),
  ends_at: z.iso.datetime({ offset: true }),
  venue: z.string().min(1),
  address: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  description: z.string(),
  organizer: z.string(),
  /** Expected number of participants; absent for reports and road works. */
  attendance: z.number().int().nonnegative().optional(),
  /** Ticket price in PLN; 0 means free, absent means not applicable. */
  price_pln: z.number().nonnegative().optional(),
  tags: z.array(z.string()),
  wheelchair_accessible: z.boolean().optional(),
  /** Effect on traffic or public space, in plain language. */
  impact: z.string().optional(),
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
  endsAt: string;
  venue: string;
  address: string;
  location: { lat: number; lng: number };
  description: string;
  organizer: string;
  attendance?: number;
  pricePln?: number;
  tags: string[];
  wheelchairAccessible?: boolean;
  impact?: string;
};

export type EventsResult = {
  /** "demo" while the endpoint serves mock data. */
  source: string;
  events: CityEvent[];
  /** Records dropped because they did not match the contract. */
  invalidCount: number;
};
