import { spawnSync } from "node:child_process";
import { accessSync, closeSync, constants, existsSync, mkdirSync, openSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const [operation, input] = process.argv.slice(2);
const operations = ["check", "up", "status", "logs", "backup", "restore-check"];
if (!operations.includes(operation) || (input && operation !== "restore-check") || process.argv.length > 4) {
  console.error("Use npm run deploy[:check|:status|:logs|:backup|:restore-check]. Restore-check requires an absolute dump path.");
  process.exit(1);
}

const envFile = resolve(root, ".env");
const env = { ...(existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {}), ...process.env };
const project = env.COMPOSE_PROJECT_NAME || "mradar";
const composeFiles = ["compose", "-p", project, "-f", "compose.yaml", "-f", "compose.scaleway.yaml"];
const stamp = new Date().toISOString().replaceAll(":", "-");
let stoppedWriters = false;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit", ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args[0] ?? ""} failed. Check the preceding output.`);
  return result.stdout?.toString().trim() ?? "";
}

function compose(args, options) {
  return run("docker", [...composeFiles, ...args], options);
}

function capture(command, args) {
  return run(command, args, { stdio: ["ignore", "pipe", "inherit"] });
}

function query(database, sql) {
  return compose(["exec", "-T", "db", "psql", "-U", "smart_city", "-d", database, "-v", "ON_ERROR_STOP=1", "-Atc", sql], {
    stdio: ["ignore", "pipe", "inherit"],
  });
}

function backupDirectory() {
  const directory = env.MRADAR_BACKUP_DIR || "/var/backups/mradar";
  if (!isAbsolute(directory)) throw new Error("MRADAR_BACKUP_DIR must be an absolute path outside the repository.");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const fromRoot = relative(realpathSync(root), realpathSync(directory));
  if (fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot)) throw new Error("MRADAR_BACKUP_DIR must be outside the repository.");
  accessSync(directory, constants.W_OK);
  return directory;
}

function backup() {
  const directory = backupDirectory();
  const path = resolve(directory, `${stamp}-${env.MRADAR_REVISION.slice(0, 12)}.dump`);
  const descriptor = openSync(path, "wx", 0o600);
  try {
    compose(["exec", "-T", "db", "pg_dump", "-U", "smart_city", "-d", "smart_city", "--format=custom"], {
      stdio: ["ignore", descriptor, "inherit"],
    });
  } catch (error) {
    rmSync(path);
    throw error;
  } finally {
    closeSync(descriptor);
  }
  console.log(`Database backup saved: ${path}. Copy it off this VM using a private channel.`);
  return path;
}

async function checkHttps() {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    try {
      const response = await fetch(`${env.APP_ORIGIN}/api/health/ready`, { signal: AbortSignal.timeout(5000), redirect: "error" });
      if (response.ok && (await response.json()).data?.status === "ready") return;
    } catch {
      // DNS and certificate issuance may take a moment on first startup.
    }
    await new Promise((done) => setTimeout(done, 5000));
  }
  throw new Error("Public HTTPS readiness failed. Check DNS, ports 80/443 and npm run deploy:logs.");
}

try {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(project)) throw new Error("COMPOSE_PROJECT_NAME must contain lowercase letters, digits, hyphens or underscores.");
  run(process.execPath, ["scripts/stack.mjs", "check", "--production"]);
  const origin = new URL(env.APP_ORIGIN);
  if (origin.protocol !== "https:" || origin.port || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*[a-z0-9]$/i.test(origin.hostname)) {
    throw new Error("APP_ORIGIN must be https:// plus a DNS hostname, without a custom port. Set its DNS record to the VM first.");
  }
  env.MRADAR_REVISION = capture("git", ["rev-parse", "HEAD"]);
  compose(["config", "--quiet"]);
  if (operation === "check") {
    console.log(`Deployment configuration is valid for ${env.APP_ORIGIN} (Compose project ${project}). No connectivity or capacity claim.`);
  } else if (operation === "status") {
    compose(["ps"]);
  } else if (operation === "logs") {
    compose(["logs", "--tail", "100", "--follow"]);
  } else if (operation === "backup") {
    backup();
  } else if (operation === "restore-check") {
    if (!input || !isAbsolute(input) || !existsSync(input)) throw new Error("Provide an existing absolute dump path: npm run deploy:restore-check -- /path/backup.dump");
    const scratch = `mradar_restore_${randomUUID().replaceAll("-", "")}`;
    compose(["exec", "-T", "db", "createdb", "-U", "smart_city", scratch]);
    try {
      const descriptor = openSync(input, "r");
      try {
        compose(["exec", "-T", "db", "pg_restore", "-U", "smart_city", "--no-owner", "--no-acl", "--exit-on-error", "-d", scratch], { stdio: [descriptor, "inherit", "inherit"] });
      } finally {
        closeSync(descriptor);
      }
      console.log(`Restored migrations:\n${query(scratch, "SELECT name FROM schema_migrations ORDER BY name")}`);
      console.log(`Restored actor/session counts:\n${query(scratch, "SELECT 'actors', count(*) FROM actors UNION ALL SELECT 'sessions', count(*) FROM sessions")}`);
      console.log("Scratch restore succeeded; no application or worker was connected to this database.");
    } finally {
      compose(["exec", "-T", "db", "dropdb", "-U", "smart_city", scratch]);
    }
  } else {
    if (capture("git", ["status", "--porcelain"])) throw new Error("Deploy a clean committed checkout. Commit or account for changes first; use a merged release revision.");
    backupDirectory();
    const services = compose(["config", "--services"], { stdio: ["ignore", "pipe", "inherit"] }).split("\n");
    const writers = ["app", ...(services.includes("worker") ? ["worker"] : [])];
    console.log(`Building revision ${env.MRADAR_REVISION} before stopping the current application.`);
    compose(["build", "setup", ...writers]);
    compose(["run", "--rm", "--no-deps", "caddy", "caddy", "validate", "--config", "/etc/caddy/Caddyfile"]);
    const previousImages = compose(["images", "--format", "json"], { stdio: ["ignore", "pipe", "inherit"] });
    compose(["up", "-d", "--no-recreate", "--wait", "--wait-timeout", "90", "db"]);
    compose(["stop", "--timeout", "30", ...writers]);
    stoppedWriters = true;
    const dumpPath = backup();
    writeFileSync(`${dumpPath}.release.json`, JSON.stringify({ revision: env.MRADAR_REVISION, origin: env.APP_ORIGIN, project, previousImages, startedAt: stamp }, null, 2), { mode: 0o600, flag: "wx" });
    compose(["run", "--rm", "--no-deps", "setup", "npm", "run", "db:setup"]);
    compose(["up", "-d", "--no-deps", "--no-build", "--wait", "--wait-timeout", "180", ...writers, "caddy"]);
    stoppedWriters = false;
    await checkHttps();
    const migrations = query("smart_city", "SELECT name FROM schema_migrations ORDER BY name");
    const images = compose(["images", "--format", "json"], { stdio: ["ignore", "pipe", "inherit"] });
    writeFileSync(`${dumpPath}.release.json`, JSON.stringify({ revision: env.MRADAR_REVISION, origin: env.APP_ORIGIN, project, previousImages, images, migrations: migrations.split("\n"), startedAt: stamp, readyAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
    console.log(`Deployed ${env.MRADAR_REVISION} at ${env.APP_ORIGIN}. HTTPS readiness passed. Complete the authentication and provider checks in deploy/README.md.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Deployment command failed.");
  if (stoppedWriters) console.error("The application was stopped for maintenance. Inspect the migration/backup result before restarting; follow deploy/README.md for recovery. No destructive rollback was attempted.");
  process.exitCode = 1;
}
