import "server-only";

import { timingSafeEqual } from "node:crypto";
import { sessionContext, systemContext, type ActorContext } from "@/server/actor-context";
import type { Actor } from "@/server/auth/types";
import { getPool } from "@/server/db";
import { ApiError } from "@/server/http/api";
import { tokenDigest, type CredentialScope, type McpConfig } from "./config";

const institutions = {
  electricity: { username: "electricity", institutionId: "demo-electricity" },
  water: { username: "water", institutionId: "demo-water" },
} as const;

/** No cookies or caller-supplied actor fields participate in MCP authentication. */
export async function authenticateMcp(request: Request, config: McpConfig, correlationId: string): Promise<ActorContext> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = /^Bearer ([A-Za-z0-9_-]{43,128})$/i.exec(authorization)?.[1];
  const digest = tokenDigest(token ?? "invalid-mcp-token");
  let scope: CredentialScope | undefined;
  // Compare every configured scope with fixed-length hashes, without early exit.
  for (const credential of config.credentials) {
    if (timingSafeEqual(digest, credential.digest)) scope = credential.scope;
  }
  if (!token || !scope || config.expiresAt <= Date.now()) {
    throw new ApiError(401, "invalid_token", "A current MCP bearer credential is required.");
  }
  if (scope === "decision_maker") return systemContext("decision_maker", correlationId);

  const mapping = institutions[scope];
  // Re-read the persisted identity each request: a removed/reassigned account loses access.
  const result = await getPool().query<Actor>(
    `SELECT a.id, a.role, a.identity_kind, a.institution_id
     FROM actors a JOIN institutions i ON i.id = a.institution_id
     WHERE a.username = $1 AND a.institution_id = $2 AND a.role = 'institution'
       AND a.identity_kind = 'demo_staff' AND i.is_demo = true`,
    [mapping.username, mapping.institutionId],
  );
  if (result.rows.length !== 1) throw new ApiError(401, "invalid_token", "A current MCP bearer credential is required.");
  return sessionContext(result.rows[0], correlationId);
}
