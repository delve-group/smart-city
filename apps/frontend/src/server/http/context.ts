import "server-only";

import type { NextRequest } from "next/server";
import type { z } from "zod";
import { anonymousContext, sessionContext, type ActorContext } from "@/server/actor-context";
import { readSessionToken } from "@/server/auth/cookies";
import { findSession, requireSession } from "@/server/auth/sessions";
import type { ActorRole } from "@/server/auth/types";
import { ApiError } from "./api";
import { readJson } from "./request";

/** Authority comes from the session alone; nothing in the body can widen it. */
export async function requireActorContext(
  request: NextRequest,
  correlationId: string,
  role?: ActorRole,
): Promise<ActorContext> {
  const session = await requireSession(readSessionToken(request), role);
  return sessionContext(session.actor, correlationId);
}

/** Public reads: the session, when there is one, only personalises the answer. */
export async function optionalActorContext(request: NextRequest, correlationId: string): Promise<ActorContext> {
  const session = await findSession(readSessionToken(request));
  return session ? sessionContext(session.actor, correlationId) : anonymousContext(correlationId);
}

/** Strict schemas reject unknown properties, so injected authority fields fail here with no effect. */
export async function readBody<T>(request: Request, schema: z.ZodType<T>, maxBytes?: number): Promise<T> {
  const parsed = schema.safeParse(await readJson(request, maxBytes));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    throw new ApiError(400, "invalid_request", `${where}${issue?.message ?? "Invalid request."}`);
  }
  return parsed.data;
}
