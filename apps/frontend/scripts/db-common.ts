import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { ConfigurationError, getConfig } from "../src/server/config";

export function loadEnvironment(): void {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", {
    info: () => undefined,
    error: () => {
      throw new ConfigurationError("Could not load environment files. Check their syntax and permissions.");
    },
  });
}

export function createScriptPool(): Pool {
  return new Pool({
    connectionString: getConfig().databaseUrl,
    max: 1,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 30_000,
  });
}

export class SetupError extends Error {}

export function reportSetupFailure(operation: string, error: unknown): void {
  if (error instanceof ConfigurationError || error instanceof SetupError) {
    console.error(error.message);
  } else {
    const code = error && typeof error === "object" && "code" in error
      && typeof error.code === "string" && /^[A-Z0-9_]{3,30}$/.test(error.code)
      ? ` (${error.code})`
      : "";
    console.error(`${operation} failed${code}. Check database availability, connection settings and migration SQL.`);
  }
  process.exitCode = 1;
}
