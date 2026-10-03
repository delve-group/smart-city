import { z } from "zod";

/** Subset of a Photon (OpenStreetMap geocoder) GeoJSON feature that we use. */
export const photonFeatureSchema = z.object({
  geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
  properties: z.object({
    osm_id: z.number(),
    osm_type: z.string(),
    osm_value: z.string().optional(),
    name: z.string().optional(),
    street: z.string().optional(),
    housenumber: z.string().optional(),
    district: z.string().optional(),
    locality: z.string().optional(),
    city: z.string().optional(),
  }),
});

export type PhotonFeatureDto = z.infer<typeof photonFeatureSchema>;

export const photonResponseSchema = z.object({ features: z.array(z.unknown()) });

export type Place = {
  id: string;
  /** Primary line, e.g. "Sukiennice" or "Floriańska 12". */
  name: string;
  /** Secondary line, e.g. "Stare Miasto, Kraków". */
  detail: string;
  location: { lat: number; lng: number };
};
