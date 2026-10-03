import type { NextRequest } from "next/server";
import { readSessionToken } from "@/server/auth/cookies";
import { requireSession } from "@/server/auth/sessions";
import { getPool } from "@/server/db";
import { ApiError, handleApi, success } from "@/server/http/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleApi(async (correlationId) => {
    const { actor } = await requireSession(readSessionToken(request), "institution");
    const result = await getPool().query<{ id: string; name: string; is_demo: boolean }>(
      "SELECT id, name, is_demo FROM institutions WHERE id = $1",
      [actor.institution_id],
    );
    const institution = result.rows[0];
    if (!institution) throw new ApiError(403, "forbidden", "This account has no assigned institution.");
    return success({ actor, institution }, correlationId);
  });
}
