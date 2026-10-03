import { z } from "zod";
import { requestInstitution } from "./request";
import type { InstitutionProfile } from "./types";
import { fromMock, USE_MOCKS } from "../mocks/use-mocks";
import { mockProfile } from "../mocks/institution-store";

const profileSchema = z.object({ institution: z.object({ id: z.string(), name: z.string(), is_demo: z.boolean() }) });

/** GET /api/institution/me — the institution the signed-in account belongs to. */
export async function getProfile(signal?: AbortSignal): Promise<InstitutionProfile> {
  if (USE_MOCKS) return fromMock(mockProfile);
  const { institution } = await requestInstitution("/api/institution/me", profileSchema, { signal });
  return { id: institution.id, name: institution.name, isDemo: institution.is_demo };
}
