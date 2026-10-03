import type { NextRequest } from "next/server";
import { readSessionToken, setSessionCookie } from "@/server/auth/cookies";
import { createGuestSession, findSession } from "@/server/auth/sessions";
import { handleApi, success } from "@/server/http/api";
import { requireAppOrigin } from "@/server/http/request";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const existing = await findSession(readSessionToken(request));
    // The resident cookie only ever holds a guest session; staff sign-in lives in its own cookie.
    if (existing?.actor.role === "resident") return success(existing, correlationId);
    const issued = await createGuestSession();
    const response = success(issued.session, correlationId, 201);
    setSessionCookie(response, issued);
    return response;
  });
}
