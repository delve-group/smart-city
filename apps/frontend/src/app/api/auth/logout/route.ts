import type { NextRequest } from "next/server";
import { clearSessionCookie, readSessionToken } from "@/server/auth/cookies";
import { revokeSession } from "@/server/auth/sessions";
import { handleApi, success } from "@/server/http/api";
import { requireAppOrigin } from "@/server/http/request";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    await revokeSession(readSessionToken(request));
    const response = success({ signed_out: true }, correlationId);
    clearSessionCookie(response);
    return response;
  });
}
