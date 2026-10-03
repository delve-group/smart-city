import type { NextRequest } from "next/server";
import { handleApi, success } from "@/server/http/api";
import { readBody, requireActorContext } from "@/server/http/context";
import { requireAppOrigin } from "@/server/http/request";
import { confirmDraftSchema } from "@/server/reports/contracts";
import { confirmDraft } from "@/server/reports/drafts";

export const runtime = "nodejs";

/** Records the resident's confirmation of exactly the given revision. */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/report-drafts/[id]/confirmation">) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const ctx = await requireActorContext(request, correlationId, "resident");
    const body = await readBody(request, confirmDraftSchema);
    const draft = await confirmDraft(ctx, (await params).id, body);
    return success(draft, correlationId, 200, draft.revision);
  });
}
