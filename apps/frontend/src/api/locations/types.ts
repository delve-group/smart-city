import { z } from "zod";

const coordinatesSchema = z.strictObject({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Address lookup and exact pin lookup are separate operations. */
export const resolveLocationInputSchema = z.union([
  z.strictObject({ city: z.literal("Kraków"), address: z.string().trim().min(3).max(200) }),
  z.strictObject({ city: z.literal("Kraków"), pin: coordinatesSchema }),
]);

export const locationCandidateSchema = z.object({
  candidate_id: z.string().min(1).nullable(),
  source: z.enum(["geocoder", "map_pin", "device"]),
  label: z.string().min(1).max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  street: z.string().nullable(),
  building_number: z.string().nullable(),
  district: z.string().nullable(),
  precision: z.enum(["building", "street", "point"]),
});

export const locationBoundsSchema = z.object({
  west: z.number().min(-180).max(180), east: z.number().min(-180).max(180),
  south: z.number().min(-90).max(90), north: z.number().min(-90).max(90),
}).refine((bounds) => bounds.west < bounds.east && bounds.south < bounds.north);

export const locationResolutionSchema = z.object({
  status: z.enum(["candidates", "ambiguous", "unresolved", "unavailable", "outside_city"]),
  candidates: z.array(locationCandidateSchema).max(5),
  pin: locationCandidateSchema.nullable(),
  /** Present only when exactly one actual place name matches the query. Preview bounds are not report scope. */
  matched_place: z.object({
    candidate_id: z.string().min(1), name: z.string().min(1).max(200),
    bounds: locationBoundsSchema.nullable(),
  }).nullable().optional(),
});

export const locationResponseSchema = z.object({
  data: locationResolutionSchema,
  correlation_id: z.string().min(1),
});

export type ResolveLocationInput = z.infer<typeof resolveLocationInputSchema>;
export type LocationCandidate = z.infer<typeof locationCandidateSchema>;
export type LocationResolution = z.infer<typeof locationResolutionSchema>;
export type LocationBounds = z.infer<typeof locationBoundsSchema>;
/** Transient geography under discussion, separate from the owned draft. */
export type LocationPreview = { lat: number; lng: number; label: string; bounds?: LocationBounds | null };
