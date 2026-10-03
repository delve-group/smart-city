import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/server/config";
import type { IssuedSession } from "./types";

/** Staff sign-in and the resident map's guest identity never share a cookie, so neither can replace or block the other. */
const STAFF_COOKIE = "smart_city_session";
const RESIDENT_COOKIE = "smart_city_resident";
/** Endpoints that act for a signed-in staff account; every other endpoint acts for the resident guest. */
const STAFF_PATHS = ["/api/operations", "/api/institution", "/api/action-proposals", "/api/auth/login", "/api/auth/logout", "/api/auth/session", "/api/mcp"];

/** Search serves both: a staff session widens it, otherwise the resident guest personalises it. */
const SHARED_PATHS = ["/api/search"];

const under = (pathname: string, prefixes: string[]) => prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

function cookieToken(request: NextRequest, name: string): string | null {
  const token = request.cookies.get(name)?.value;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export function readSessionToken(request: NextRequest): string | null {
  const { pathname } = request.nextUrl;
  if (under(pathname, STAFF_PATHS)) return cookieToken(request, STAFF_COOKIE);
  if (under(pathname, SHARED_PATHS)) return cookieToken(request, STAFF_COOKIE) ?? cookieToken(request, RESIDENT_COOKIE);
  return cookieToken(request, RESIDENT_COOKIE);
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
  response.cookies.set(issued.session.actor.role === "resident" ? RESIDENT_COOKIE : STAFF_COOKIE, issued.token, {
    ...cookieOptions(),
    expires: new Date(issued.session.expires_at),
  });
}

/** Staff sign-out only; the resident guest identity stays. */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(STAFF_COOKIE, "", { ...cookieOptions(), expires: new Date(0), maxAge: 0 });
}
