import { z } from "zod";
import { requestInstitution } from "./request";
import type { InstitutionProfile } from "./types";

const profileSchema = z.object({ institution: z.object({ id: z.string(), name: z.string(), is_demo: z.boolean() }) });

/** GET /api/institution/me — the institution the signed-in account belongs to. */
export async function getProfile(signal?: AbortSignal): Promise<InstitutionProfile> {
  const { institution } = await requestInstitution("/api/institution/me", profileSchema, { signal });
  return { id: institution.id, name: institution.name, isDemo: institution.is_demo };
}
