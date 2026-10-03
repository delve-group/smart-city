import type { EventsResponseDto } from "@/api/events/types";
import { createMockEvents } from "./mock-events";

/** Mock endpoint (demo data). Replace the body with a call to the real events API. */
export function GET() {
  return Response.json({ source: "demo", events: createMockEvents() } satisfies EventsResponseDto);
}
