import type { NextRequest } from "next/server";
import { reportTriageSchema } from "@/api/operations/types";
import { officialCommand } from "@/server/http/official";
import { decideReportTriage } from "@/server/incidents/official";

export const runtime = "nodejs";

/** Link a report or correct its link, start an incident, or keep it private / out of scope. */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/operations/reports/[id]/triage">) {
  const { id } = await params;
  return officialCommand(request, reportTriageSchema, (ctx, command) => decideReportTriage(ctx, id, command));
}
