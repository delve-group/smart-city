import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/server/config";
import type { IssuedSession } from "./types";

const SESSION_COOKIE = "smart_city_session";

export function readSessionToken(request: NextRequest): string | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getConfig().appOrigin.startsWith("https://"),
    path: "/",
  };
}

export function setSessionCookie(response: NextResponse, issued: IssuedSession): void {
  response.cookies.set(SESSION_COOKIE, issued.token, {
    ...cookieOptions(),
    expires: new Date(issued.session.expires_at),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(), expires: new Date(0), maxAge: 0 });
}
