import type { NextRequest } from "next/server";
import { ticketUpdateSchema } from "@/api/institution/types";
import { handleApi, success } from "@/server/http/api";
import { readBody, requireActorContext } from "@/server/http/context";
import { requireAppOrigin } from "@/server/http/request";
import { getServiceTicket, updateServiceTicket } from "@/server/institutions/tickets";

export const runtime = "nodejs";

/** One assigned ticket. Another institution's ticket answers exactly like a missing one. */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/institution/tickets/[id]">) {
  return handleApi(async (correlationId) => {
    const ctx = await requireActorContext(request, correlationId, "institution");
    const ticket = await getServiceTicket(ctx, (await params).id);
    return success(ticket, correlationId, 200, ticket.version);
  });
}

/** Acknowledge, start, resolve or reject, against the version the operator saw. */
export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/institution/tickets/[id]">) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const ctx = await requireActorContext(request, correlationId, "institution");
    const update = await readBody(request, ticketUpdateSchema);
    const ticket = await updateServiceTicket(ctx, (await params).id, update);
    return success(ticket, correlationId, 200, ticket.version);
  });
}
