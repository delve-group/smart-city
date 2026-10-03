import type { NextRequest } from "next/server";
import { handleApi, success } from "@/server/http/api";
import { readBody, requireActorContext } from "@/server/http/context";
import { requireAppOrigin } from "@/server/http/request";
import { createDraftSchema } from "@/server/reports/contracts";
import { createDraft } from "@/server/reports/drafts";

export const runtime = "nodejs";

const DRAFT_BODY_BYTES = 16_384;

/** Starts an owned intake draft for the form or the voice dispatcher. */
export async function POST(request: NextRequest) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const ctx = await requireActorContext(request, correlationId, "resident");
    const body = await readBody(request, createDraftSchema, DRAFT_BODY_BYTES);
    const draft = await createDraft(ctx, body.fields);
    return success(draft, correlationId, 201, draft.revision);
  });
}
