import type { NextRequest } from "next/server";
import { incidentCommandSchema } from "@/api/operations/types";
import { officialCommand } from "@/server/http/official";
import { runIncidentCommand } from "@/server/incidents/official";

export const runtime = "nodejs";

/** Responsibility, verify, dispute, close and reopen, each against the version the official saw. */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/operations/incidents/[id]/commands">) {
  const { id } = await params;
  return officialCommand(request, incidentCommandSchema, (ctx, command) => runIncidentCommand(ctx, id, command));
}
