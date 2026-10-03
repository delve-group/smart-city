import type { NextRequest } from "next/server";
import { handleApi, success } from "@/server/http/api";
import { requireActorContext } from "@/server/http/context";
import { getReport } from "@/server/reports/reports";

export const runtime = "nodejs";

/** Private report for its owner or an official, including its triage state. Not a public endpoint. */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/reports/[id]">) {
  return handleApi(async (correlationId) => {
    const ctx = await requireActorContext(request, correlationId);
    const report = await getReport(ctx, (await params).id);
    return success(report, correlationId, 200, report.version);
  });
}
