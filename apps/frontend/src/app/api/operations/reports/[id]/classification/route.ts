import type { NextRequest } from "next/server";
import { reportClassificationSchema } from "@/api/operations/types";
import { officialCommand } from "@/server/http/official";
import { classifyReport } from "@/server/incidents/official";

export const runtime = "nodejs";

/** Correct a report's category, issue type or scope; the original observation is left as written. */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/operations/reports/[id]/classification">) {
  const { id } = await params;
  return officialCommand(request, reportClassificationSchema, (ctx, command) => classifyReport(ctx, id, command));
}
