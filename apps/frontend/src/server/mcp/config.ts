import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { getConfig } from "@/server/config";

export class McpConfigurationError extends Error {}

export type CredentialScope = "decision_maker" | "electricity" | "water";
export interface McpConfig {
  origin: string;
  host: string;
  expiresAt: number;
  credentials: { scope: CredentialScope; digest: Buffer }[];
}

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43,128}$/);
const credentialNames = {
  decision_maker: "MCP_DECISION_TOKEN",
  electricity: "MCP_ELECTRICITY_TOKEN",
  water: "MCP_WATER_TOKEN",
} as const;

export const tokenDigest = (token: string): Buffer => createHash("sha256").update(token).digest();

/** Lazy: optional MCP configuration never prevents core application startup. */
export function getMcpConfig(): McpConfig {
  const credentials: McpConfig["credentials"] = [];
  for (const [scope, name] of Object.entries(credentialNames)) {
    const value = process.env[name];
    if (!value) continue;
    if (!tokenSchema.safeParse(value).success) throw new McpConfigurationError(`Invalid ${name}.`);
    credentials.push({ scope: scope as CredentialScope, digest: tokenDigest(value) });
  }
  if (!credentials.length) throw new McpConfigurationError("MCP credentials are not configured.");
  if (new Set(credentials.map(({ digest }) => digest.toString("hex"))).size !== credentials.length) {
    throw new McpConfigurationError("MCP credentials must differ between scopes.");
  }
  const expiry = z.iso.datetime({ offset: true }).safeParse(process.env.MCP_TOKEN_EXPIRES_AT);
  if (!expiry.success) throw new McpConfigurationError("Set MCP_TOKEN_EXPIRES_AT to an explicit ISO timestamp.");
  const origin = getConfig().appOrigin;
  return { origin, host: new URL(origin).host, expiresAt: Date.parse(expiry.data), credentials };
}
