import type { NextRequest } from "next/server";
import { readSessionToken } from "@/server/auth/cookies";
import { requireSession } from "@/server/auth/sessions";
import { handleApi, success } from "@/server/http/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleApi(async (correlationId) => success(await requireSession(readSessionToken(request)), correlationId));
}
