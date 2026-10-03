import { z } from "zod";

export const STAFF_ROLES = ["official", "institution"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const actorDtoSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["resident", "official", "institution"]),
  identity_kind: z.enum(["guest", "demo_staff"]),
  institution_id: z.string().nullable(),
});

export const sessionEnvelopeSchema = z.object({
  data: z.object({ actor: actorDtoSchema, expires_at: z.iso.datetime({ offset: true }) }),
});

export type SessionActor = { id: string; role: "resident" | "official" | "institution"; institutionId: string | null };

export function mapActor(dto: z.infer<typeof actorDtoSchema>): SessionActor {
  return { id: dto.id, role: dto.role, institutionId: dto.institution_id };
}

/** A failed auth request with the API's machine-readable code. */
export class AuthApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function readProblem(response: Response): Promise<AuthApiError> {
  const body = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
  return new AuthApiError(response.status, body?.code ?? "unexpected_response", body?.message ?? `The request failed (${response.status}).`);
}
