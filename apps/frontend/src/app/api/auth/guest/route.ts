import type { NextRequest } from "next/server";
import { readSessionToken, setSessionCookie } from "@/server/auth/cookies";
import { createGuestSession, findSession } from "@/server/auth/sessions";
import { ApiError, handleApi, success } from "@/server/http/api";
import { requireAppOrigin } from "@/server/http/request";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const existing = await findSession(readSessionToken(request));
    if (existing) {
      if (existing.actor.role !== "resident") {
        throw new ApiError(409, "session_role_conflict", "Sign out of the staff account before starting a guest session.");
      }
      return success(existing, correlationId);
    }
    const issued = await createGuestSession();
    const response = success(issued.session, correlationId, 201);
    setSessionCookie(response, issued);
    return response;
  });
}
