import { z } from "zod";

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1).refine((value) => {
    try {
      const url = new URL(value);
      return ["postgres:", "postgresql:"].includes(url.protocol)
        && Boolean(url.hostname)
        && url.pathname.length > 1;
    } catch {
      return false;
    }
  }, "must be a PostgreSQL connection URL including a database name"),
  APP_ORIGIN: z.string().url().refine((value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol)
        && !url.username
        && !url.password
        && (url.pathname === "/" || url.pathname === "")
        && !url.search
        && !url.hash;
    } catch {
      return false;
    }
  }, "must be an HTTP(S) origin without a path, credentials, query or fragment"),
  DECISION_PROVIDER: z.enum(["disabled", "scaleway"]).default("disabled"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
}).superRefine((environment, context) => {
  if (environment.NODE_ENV === "production" && !environment.APP_ORIGIN.startsWith("https://")) {
    context.addIssue({
      code: "custom",
      path: ["APP_ORIGIN"],
      message: "must use HTTPS in production",
    });
  }
});

const demoPasswordsSchema = z.object({
  DEMO_OFFICIAL_PASSWORD: z.string().min(12).max(256),
  DEMO_ELECTRICITY_PASSWORD: z.string().min(12).max(256),
  DEMO_WATER_PASSWORD: z.string().min(12).max(256),
});

const databaseFieldsSchema = z.object({
  PGHOST: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/),
  PGPORT: z.coerce.number().int().min(1).max(65_535),
  PGUSER: z.string().min(1),
  PGPASSWORD: z.string().min(1),
  PGDATABASE: z.string().min(1),
});

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const result = databaseFieldsSchema.safeParse(process.env);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new ConfigurationError(
      `Set DATABASE_URL or all PostgreSQL connection fields. Missing or invalid: ${fields.join(", ")}.`,
    );
  }

  const url = new URL("postgresql://localhost");
  url.hostname = result.data.PGHOST;
  url.port = String(result.data.PGPORT);
  url.username = encodeURIComponent(result.data.PGUSER);
  url.password = encodeURIComponent(result.data.PGPASSWORD);
  url.pathname = `/${encodeURIComponent(result.data.PGDATABASE)}`;
  return url.toString();
}

export interface RuntimeConfig {
  databaseUrl: string;
  appOrigin: string;
  isProduction: boolean;
}

let config: RuntimeConfig | undefined;

export function getConfig(): RuntimeConfig {
  if (config) return config;

  const result = environmentSchema.safeParse({
    ...process.env,
    DATABASE_URL: getDatabaseUrl(),
  });
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new ConfigurationError(
      `Missing or invalid environment variables: ${fields.join(", ")}. Check .env.example; production APP_ORIGIN must use HTTPS.`,
    );
  }

  config = {
    databaseUrl: result.data.DATABASE_URL,
    appOrigin: new URL(result.data.APP_ORIGIN).origin,
    isProduction: result.data.NODE_ENV === "production",
  };
  return config;
}

export function getDemoPasswords() {
  const result = demoPasswordsSchema.safeParse(process.env);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new ConfigurationError(
      `Missing or invalid demo seed passwords: ${fields.join(", ")}. Each must contain 12–256 characters.`,
    );
  }
  return result.data;
}
