import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/server/config";
import type { ActorRole, IssuedSession } from "./types";

/**
 * One cookie per kind of identity, so the resident guest, the official and the institution can all be
 * signed in in the same browser and never replace or block each other.
 */
const COOKIE: Record<ActorRole, string> = {
  resident: "smart_city_resident",
  official: "smart_city_session",
  institution: "smart_city_institution",
};
const OFFICIAL_PATHS = ["/api/operations", "/api/action-proposals", "/api/mcp"];
const INSTITUTION_PATHS = ["/api/institution"];
/** Shared staff endpoints name the screen's role in `?role=`. */
const STAFF_AUTH_PATHS = ["/api/auth/login", "/api/auth/logout", "/api/auth/session"];
/** Search serves everyone: a staff session widens it, otherwise the resident guest personalises it. */
const SHARED_PATHS = ["/api/search"];

const under = (pathname: string, prefixes: string[]) => prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

function cookieToken(request: NextRequest, role: ActorRole): string | null {
  const token = request.cookies.get(COOKIE[role])?.value;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

/** The staff role a shared auth endpoint acts for; defaults to the official. */
export function staffRoleOf(request: NextRequest): "official" | "institution" {
  return request.nextUrl.searchParams.get("role") === "institution" ? "institution" : "official";
}

export function readSessionToken(request: NextRequest): string | null {
  const { pathname } = request.nextUrl;
  if (under(pathname, OFFICIAL_PATHS)) return cookieToken(request, "official");
  if (under(pathname, INSTITUTION_PATHS)) return cookieToken(request, "institution");
  if (under(pathname, STAFF_AUTH_PATHS)) return cookieToken(request, staffRoleOf(request));
  if (under(pathname, SHARED_PATHS)) {
    return cookieToken(request, "official") ?? cookieToken(request, "institution") ?? cookieToken(request, "resident");
  }
  return cookieToken(request, "resident");
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
  response.cookies.set(COOKIE[issued.session.actor.role], issued.token, {
    ...cookieOptions(),
    expires: new Date(issued.session.expires_at),
  });
}

/** Signs out one staff role; the other role and the resident guest stay. */
export function clearSessionCookie(response: NextResponse, role: "official" | "institution"): void {
  response.cookies.set(COOKIE[role], "", { ...cookieOptions(), expires: new Date(0), maxAge: 0 });
}
