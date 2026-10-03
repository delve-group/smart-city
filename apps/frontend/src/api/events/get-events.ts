import { mapEventsResponse } from "./mappers";
import { eventsResponseSchema, type EventsResult } from "./types";

/** GET /api/events */
export async function getEvents(signal?: AbortSignal): Promise<EventsResult> {
  const response = await fetch("/api/events", { signal });
  if (!response.ok) throw new Error(`Serwer zwrócił błąd ${response.status}.`);

  const body = eventsResponseSchema.safeParse(await response.json());
  if (!body.success) throw new Error("Odpowiedź API ma nieoczekiwany format.");

  return mapEventsResponse(body.data.source, body.data.events);
}
