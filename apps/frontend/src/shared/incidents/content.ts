import { z } from "zod";

const narrative = z.strictObject({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(1200),
});

/** Observation-based public text, with personal and unit details removed. */
export const incidentContentSchema = z.strictObject({ en: narrative, pl: narrative });
export type IncidentContent = z.infer<typeof incidentContentSchema>;
