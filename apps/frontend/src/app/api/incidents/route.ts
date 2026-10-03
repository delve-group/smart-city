import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, handleApi, success } from "@/server/http/api";
import { optionalActorContext } from "@/server/http/context";
import { listPublicIncidents } from "@/server/incidents/public";

export const runtime = "nodejs";

const ASSESSMENTS = ["suspected", "corroborated", "verified", "disputed"] as const;
const RESPONSE_STATUSES = ["new", "triaged", "assigned", "in_progress", "resolved", "closed"] as const;

const querySchema = z.object({
  bbox: z
    .string()
    .transform((value) => value.split(",").map(Number))
    .refine((parts) => parts.length === 4 && parts.every(Number.isFinite) && parts[0] <= parts[2] && parts[1] <= parts[3], "Use west,south,east,north.")
    .optional(),
  category_id: z.array(z.string().min(1).max(64)).max(20),
  assessment: z.array(z.enum(ASSESSMENTS)),
  response_status: z.array(z.enum(RESPONSE_STATUSES)),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  cursor: z.string().max(200).nullable(),
});

/** Public incident cards and timelines. No session needed; a resident session adds `viewer_support`. */
export async function GET(request: NextRequest) {
  return handleApi(async (correlationId) => {
    const search = request.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      bbox: search.get("bbox") ?? undefined,
      category_id: search.getAll("category_id"),
      assessment: search.getAll("assessment"),
      response_status: search.getAll("response_status"),
      limit: search.get("limit") ?? undefined,
      cursor: search.get("cursor"),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ApiError(400, "invalid_request", `${issue?.path.join(".") ?? "query"}: ${issue?.message ?? "Invalid filter."}`);
    }
    const { bbox, ...filters } = parsed.data;
    const ctx = await optionalActorContext(request, correlationId);
    const page = await listPublicIncidents(ctx, {
      bbox: bbox ? { west: bbox[0], south: bbox[1], east: bbox[2], north: bbox[3] } : undefined,
      category_ids: filters.category_id,
      assessments: filters.assessment,
      response_statuses: filters.response_status,
      limit: filters.limit,
      cursor: filters.cursor,
    });
    return success(page, correlationId);
  });
}
