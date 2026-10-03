import { locationResponseSchema, resolveLocationInputSchema, type LocationResolution, type ResolveLocationInput } from "./types";

/** Stateless geography lookup. Selecting a result never confirms an intake draft. */
export async function resolveLocation(input: ResolveLocationInput, signal?: AbortSignal): Promise<LocationResolution> {
  const response = await fetch("/api/locations/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resolveLocationInputSchema.parse(input)),
    signal,
  });
  if (!response.ok) throw new Error("Address lookup is unavailable. Retry or use the map pin.");
  const body = locationResponseSchema.safeParse(await response.json());
  if (!body.success) throw new Error("Address lookup returned an unexpected response. Use the map pin.");
  return body.data.data;
}
