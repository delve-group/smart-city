import type { NextRequest } from "next/server";
import { readSessionToken, setSessionCookie } from "@/server/auth/cookies";
import { loginInputSchema, loginStaff } from "@/server/auth/login";
import { ApiError, handleApi, success } from "@/server/http/api";
import { readJson, requireAppOrigin } from "@/server/http/request";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const input = loginInputSchema.safeParse(await readJson(request));
    if (!input.success) throw new ApiError(400, "invalid_request", "Provide only a username and password.");
    const result = await loginStaff(input.data, readSessionToken(request));
    if (result.kind === "limited") {
      throw new ApiError(429, "rate_limited", "Too many failed sign-in attempts. Try again later.", true, result.retryAfter);
    }
    if (result.kind === "invalid") throw new ApiError(401, "invalid_credentials", "The username or password is incorrect.");
    const response = success(result.issued.session, correlationId);
    setSessionCookie(response, result.issued);
    return response;
  });
}
