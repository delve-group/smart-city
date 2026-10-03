import type { NextRequest } from "next/server";
import { reconciliationSchema } from "@/api/operations/types";
import { reconcileExecution } from "@/server/actions/executor";
import { officialCommand } from "@/server/http/official";

export const runtime = "nodejs";

/** Resolve an unknown sending outcome by looking the request up at the institution. Nothing is resent. */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/action-proposals/[id]/reconciliation">) {
  const { id } = await params;
  return officialCommand(request, reconciliationSchema, async (ctx, input) => {
    await reconcileExecution(ctx, id, input);
  });
}
