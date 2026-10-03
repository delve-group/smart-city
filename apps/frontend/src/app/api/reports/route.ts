import type { NextRequest } from "next/server";
import { createReportInputSchema, type ReportsResponseDto } from "@/api/reports/types";
import { handleApi, success } from "@/server/http/api";
import { readBody, requireActorContext } from "@/server/http/context";
import { requireAppOrigin } from "@/server/http/request";
import { submitReportSchema } from "@/server/reports/contracts";
import { submitDraft } from "@/server/reports/submission";
import { CATEGORIES } from "../categories/categories";
import { addReport, listReports } from "./report-store";

export const runtime = "nodejs";

/** Mock endpoint (demo data, in-memory). Durable reports are private and never appear here. */
export function GET() {
  return Response.json({ source: "demo", reports: listReports() } satisfies ReportsResponseDto);
}

/**
 * Two contracts share this path until the citizen cutover (docs/workflow-contracts.md §10):
 * a body with `draft_id` is the durable, authenticated submission of a confirmed draft;
 * anything else is the legacy raw-create request and stays on the in-memory demo store.
 */
export async function POST(request: NextRequest) {
  const peek: unknown = await request.clone().json().catch(() => null);
  if (peek && typeof peek === "object" && "draft_id" in peek) return submitConfirmedDraft(request);

  const parsed = createReportInputSchema.safeParse(peek);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid report." }, { status: 400 });
  }
  if (!CATEGORIES.some((category) => category.id === parsed.data.category_id)) {
    return Response.json({ error: "Unknown category." }, { status: 400 });
  }
  return Response.json(addReport(parsed.data), { status: 201 });
}

function submitConfirmedDraft(request: NextRequest) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const ctx = await requireActorContext(request, correlationId, "resident");
    const body = await readBody(request, submitReportSchema);
    const { report, replayed } = await submitDraft(ctx, body);
    return success(report, correlationId, replayed ? 200 : 201, report.version);
  });
}
