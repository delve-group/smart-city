import type { NextRequest } from "next/server";
import { handleApi, success } from "@/server/http/api";
import { readBody, requireActorContext } from "@/server/http/context";
import { requireAppOrigin } from "@/server/http/request";
import { updateDraftSchema } from "@/server/reports/contracts";
import { getDraft, updateDraft } from "@/server/reports/drafts";

export const runtime = "nodejs";

const DRAFT_BODY_BYTES = 16_384;

/** Recovers the owned draft, its confirmation and, after submission, the committed report reference. */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/report-drafts/[id]">) {
  return handleApi(async (correlationId) => {
    const ctx = await requireActorContext(request, correlationId, "resident");
    const draft = await getDraft(ctx, (await params).id);
    return success(draft, correlationId, 200, draft.revision);
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/report-drafts/[id]">) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const ctx = await requireActorContext(request, correlationId, "resident");
    const body = await readBody(request, updateDraftSchema, DRAFT_BODY_BYTES);
    const draft = await updateDraft(ctx, (await params).id, body);
    return success(draft, correlationId, 200, draft.revision);
  });
}
