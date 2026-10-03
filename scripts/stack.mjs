import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2];
const production = mode === "production" || (mode === "check" && process.argv.includes("--production"));
if (!["dev", "production", "check", "down", "logs"].includes(mode)) {
  console.error("Use npm run dev, npm start, npm run config:check, stack:down or stack:logs.");
  process.exit(1);
}

const envPath = `${root}.env`;
const fileEnv = existsSync(envPath) ? parseEnv(readFileSync(envPath, "utf8")) : {};
const env = { ...fileEnv, ...process.env };
const problems = [];
for (const name of ["POSTGRES_PASSWORD", "DEMO_OFFICIAL_PASSWORD", "DEMO_ELECTRICITY_PASSWORD", "DEMO_WATER_PASSWORD"]) {
  if (!env[name] || env[name].length < 12 || env[name].length > 256) problems.push(`${name}: set a password of 12–256 characters`);
}
try {
  const origin = new URL(env.APP_ORIGIN ?? "");
  if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== env.APP_ORIGIN) {
    problems.push("APP_ORIGIN: use an HTTP(S) origin without a path or trailing slash");
  }
  if (production && origin.protocol !== "https:") problems.push("APP_ORIGIN: production requires HTTPS");
} catch {
  problems.push("APP_ORIGIN: set the browser origin, for example http://localhost:3000");
}
if (!/^\d+$/.test(env.APP_PORT ?? "3000") || Number(env.APP_PORT ?? 3000) < 1 || Number(env.APP_PORT ?? 3000) > 65535) {
  problems.push("APP_PORT: use a port number from 1 to 65535");
}
if (problems.length > 0) {
  console.error(`Configuration is incomplete. Copy .env.example to .env and fill the values:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
  process.exit(1);
}
if (mode === "check") {
  console.log(`${production ? "Production" : "Local"} stack configuration is valid. Provider credentials are not required yet.`);
  process.exit(0);
}

const files = ["-f", "compose.yaml"];
if (mode === "dev" || mode === "logs" || mode === "down") files.push("-f", "compose.dev.yaml");
const operation = mode === "down" ? ["down"] : mode === "logs" ? ["logs", "--follow"] : ["up", "--build", "--wait", "--wait-timeout", "180"];
const result = spawnSync("docker", ["compose", ...files, ...operation], { cwd: root, env, stdio: "inherit" });
if (result.error) console.error("Could not start Docker Compose. Install and start Docker Desktop or Docker Engine with Compose v2.");
if (result.status === 0 && ["dev", "production"].includes(mode)) {
  console.log(`Stack is ready. Browser origin: ${env.APP_ORIGIN}. Use npm run stack:logs to view logs, npm run stack:down to stop (data is retained).`);
} else if (result.status !== 0 && ["dev", "production"].includes(mode)) {
  console.error("Stack startup did not complete. Run npm run stack:logs to inspect application, worker, setup and database errors. For a running worker, use docker compose exec worker npm run worker:status to inspect its heartbeat, registered handlers and queue counts.");
}
process.exit(result.status ?? 1);
