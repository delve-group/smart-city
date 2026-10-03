import "server-only";

import type { NextRequest } from "next/server";
import type { z } from "zod";
import type { ActorContext } from "@/server/actor-context";
import { getWorkspace } from "@/server/incidents/workspace";
import { handleApi, success } from "./api";
import { readBody, requireActorContext } from "./context";
import { requireAppOrigin } from "./request";

/**
 * One official command: origin check, official session, strict body, then the refreshed
 * workspace, which is what the /operations screen renders after every decision.
 */
export function officialCommand<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
  run: (ctx: ActorContext, body: T) => Promise<number | void>,
) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const ctx = await requireActorContext(request, correlationId, "official");
    const version = await run(ctx, await readBody(request, schema));
    return success(await getWorkspace(ctx), correlationId, 200, version ?? undefined);
  });
}
