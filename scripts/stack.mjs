import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2];
const production = mode === "production" || process.argv.includes("--production");
const searchCommand = ["search:setup", "search:rebuild"].includes(mode);
if (!["dev", "production", "check", "down", "logs", "search:setup", "search:rebuild"].includes(mode)
  || process.argv.slice(3).some((argument) => argument !== "--production")
  || (process.argv.includes("--production") && mode !== "check" && !searchCommand)) {
  console.error("Use npm run dev, npm start, npm run config:check, stack:down, stack:logs, search:setup or search:rebuild. Search commands accept --production for the deployed stack.");
  process.exit(searchCommand ? 2 : 1);
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
const decisionProvider = env.DECISION_PROVIDER ?? "disabled";
if (!["disabled", "scaleway"].includes(decisionProvider)) {
  problems.push("DECISION_PROVIDER: use disabled or scaleway");
}
if (decisionProvider === "scaleway") {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(env.SCW_PROJECT_ID ?? "")) {
    problems.push("SCW_PROJECT_ID: set the dedicated Scaleway project UUID");
  }
  if (!env.SCW_GENERATIVE_API_KEY || env.SCW_GENERATIVE_API_KEY.length > 512 || /\s/.test(env.SCW_GENERATIVE_API_KEY)) {
    problems.push("SCW_GENERATIVE_API_KEY: set the project's model-access credential");
  }
  if (!["qwen3.6-35b-a3b", "mistral-small-3.2-24b-instruct-2506"].includes(env.SCW_DECISION_MODEL)) {
    problems.push("SCW_DECISION_MODEL: choose a supported model from .env.example");
  }
}
if (env.QDRANT_URL !== undefined && env.QDRANT_URL !== "http://qdrant:6333") {
  problems.push("QDRANT_URL: the Compose stack requires its private service URL; remove this override");
}
if (env.QDRANT_API_KEY !== undefined) problems.push("QDRANT_API_KEY: the private Compose service does not use credentials; remove this override");
if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(env.QDRANT_COLLECTION ?? "mradar_records_v1")) {
  problems.push("QDRANT_COLLECTION: use 1–64 letters, digits, underscores or hyphens, starting with a letter or digit");
}
if (env.SEARCH_MODEL_CACHE_DIR !== undefined && env.SEARCH_MODEL_CACHE_DIR !== "/home/node/.cache/mradar-models") {
  problems.push("SEARCH_MODEL_CACHE_DIR: the Compose stack requires its shared model volume path; remove this override");
}
if (problems.length > 0) {
  console.error(`Configuration is incomplete. Copy .env.example to .env and fill the values:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
  process.exit(searchCommand ? 2 : 1);
}
if (mode === "check") {
  console.log(`${production ? "Production" : "Local"} stack configuration is valid. Private search needs no provider credentials; availability is checked during setup.`);
  process.exit(0);
}

if (searchCommand && production) {
  const result = spawnSync(process.execPath, ["scripts/deploy.mjs", mode], { cwd: root, env, stdio: "inherit" });
  process.exit(result.status ?? 1);
}

const files = ["-f", "compose.yaml"];
if (mode !== "production") files.push("-f", "compose.dev.yaml");
function compose(args) {
  const result = spawnSync("docker", ["compose", ...files, ...args], { cwd: root, env, stdio: "inherit" });
  if (result.error) console.error("Could not run Docker Compose. Install and start Docker Desktop or Docker Engine with Compose v2.");
  return result.status ?? 1;
}

if (mode === "down" || mode === "logs") process.exit(compose(mode === "down" ? ["down"] : ["logs", "--follow"]));
if (searchCommand) {
  if (mode === "search:setup" && compose(["up", "-d", "--no-recreate", "qdrant"]) !== 0) process.exit(1);
  const status = compose(["exec", "-T", "app", "npm", "run", mode]);
  if (status === 0 && mode === "search:setup") console.log("Search provider setup is ready. Run npm run search:rebuild to enqueue source reconciliation.");
  process.exit(status);
}

if (compose(["build", "setup", "app", "worker", "search-setup"]) !== 0) process.exit(1);
let searchReady = false;
if (compose(["up", "-d", "--no-recreate", "qdrant"]) === 0) {
  let status = compose(["run", "--rm", "--no-deps", "search-setup"]);
  if (status === 1) {
    console.warn("Search setup was temporarily unavailable. Retrying once.");
    status = compose(["run", "--rm", "--no-deps", "search-setup"]);
  }
  if (status === 2) {
    console.error("Search configuration or index compatibility failed. Core startup was not changed; fix the named configuration before retrying.");
    process.exit(2);
  }
  searchReady = status === 0;
}
if (!searchReady) console.warn("Search is degraded: Qdrant or model setup is unavailable. Continuing core startup; indexing work remains recoverable.");
// Older worker images shared the seed lock; stop them before setup during this upgrade.
if (compose(["stop", "--timeout", "35", "worker"]) !== 0) process.exit(1);
const status = compose(["up", "-d", "--no-build", "--wait", "--wait-timeout", "180", "app", "worker"]);
if (status !== 0) {
  console.error("Core startup did not complete. Run npm run stack:logs to inspect application, worker, setup and database errors.");
  process.exit(status);
}
if (searchReady) searchReady = compose(["exec", "-T", "app", "npm", "run", "search:rebuild"]) === 0;
console.log(`Core is ready at ${env.APP_ORIGIN}. Search is ${searchReady ? "provider-ready; source reconciliation is queued" : "degraded; retry npm run search:setup, then npm run search:rebuild"}.`);
console.log("Use npm run stack:logs to view logs, npm run stack:down to stop (data is retained). Inspect indexing progress with docker compose exec worker npm run worker:status.");
