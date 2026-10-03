import type { NextRequest } from "next/server";
import { ApiError, handleApi, success } from "@/server/http/api";
import { requireActorContext } from "@/server/http/context";
import { readJson, requireAppOrigin } from "@/server/http/request";
import { submitReportSchema } from "@/server/reports/contracts";
import { submitDraft } from "@/server/reports/submission";

export const runtime = "nodejs";

/** Stale public-map clients must reload; private reports are never a public incident feed. */
export function GET() {
  return handleApi(() => { throw new ApiError(410, "endpoint_retired", "Public reports were replaced by incidents. Reload the application."); });
}

/**
 * Citizen cutover: only an owned, confirmed draft creates a report.
 */
export async function POST(request: NextRequest) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const raw = await readJson(request);
    if (raw && typeof raw === "object" && ("title" in raw || "category_id" in raw) && !("draft_id" in raw)) {
      throw new ApiError(400, "legacy_contract_retired", "Create and confirm a report draft before submitting. Reload the application.");
    }
    const ctx = await requireActorContext(request, correlationId, "resident");
    const parsed = submitReportSchema.safeParse(raw);
    if (!parsed.success) throw new ApiError(400, "invalid_request", "Submit a draft ID and its confirmed revision.");
    const body = parsed.data;
    const { report, replayed } = await submitDraft(ctx, body);
    return success(report, correlationId, replayed ? 200 : 201, report.version);
  });
}
