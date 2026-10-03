# mRadar

Smart City hackathon project: residents report city problems and follow the response on a shared map. The repository includes the knowledge base, working rules, design system and a Next.js app built with [Appica UI](https://appica.dev/ui).

- [Agent rules](AGENTS.md)
- [Knowledge base](docs/knowledge-base/README.md)
- [Voice and incident feature specification](specs/001-voice-incident-response/spec.md) and [ElevenLabs implementation plan](specs/001-voice-incident-response/plan.md)
- [System architecture](docs/architecture.md) — includes the [libraries used](docs/architecture.md#libraries)
- [Design system](docs/design-system.md)
- [Frontend](apps/frontend) and its [agent rules](apps/frontend/AGENTS.md) — resident map at `/`, official workspace (demo data, no sign-in yet) at `/operations`
- [App tokens](apps/frontend/src/shared/styles/appica-theme.css)

## Running

Requires Docker with Compose v2 and Node.js 22.14+ for the root command shortcuts. Docker supplies the application's Node runtime. The root package has no dependencies and is not an npm workspace.

```bash
cp .env.example .env
# Fill the four passwords in .env (at least 12 characters each).
npm run dev
```

The app runs at http://localhost:3000. This command validates configuration, builds the containers, starts PostgreSQL, runs migrations and seeds fictional staff accounts, then starts the app with hot reload. It returns after readiness succeeds. Missing configuration is reported by variable name, without printing credentials. No ElevenLabs or Qdrant account is needed for this slice.

```bash
npm run config:check
npm run stack:logs
npm run stack:down
```

Stopping retains the PostgreSQL volume. Repeating startup is safe: applied migrations are skipped and existing demo passwords are preserved. Changing a seed password in `.env` does not rotate an existing account. Database credentials must also keep matching an existing volume. Use a separate Compose project for a fresh disposable database instead of deleting someone else's data.

The source, scripts and migration directories are mounted into the development app. Code edits reload automatically; rerun `npm run dev` after changing dependencies, Docker/configuration files or adding migrations. PostgreSQL is reachable inside the Compose network as `db:5432`; it has no public host port. To inspect it locally:

```bash
docker compose exec db psql -U smart_city -d smart_city
```

The direct Compose equivalent is `docker compose -f compose.yaml -f compose.dev.yaml up --build --wait`. Compose also rejects absent required environment variables; application startup checks validate their format.

## Backend foundation

The backend lives in `apps/frontend/src/server/` behind thin Next.js route handlers. It currently implements PostgreSQL-backed guest/staff sessions, demo institution membership, health checks and access-controlled identity endpoints. SQL migrations are in `apps/frontend/db/migrations/`; add a new numbered file for each schema change and never edit an applied migration. Transactions and a migration lock prevent concurrent setup from applying the same migration twice.

| Method and path | Purpose |
| --- | --- |
| `GET /api/health/live` | Check that the API process responds. |
| `GET /api/health/ready` | Check database access and the required auth migration. |
| `POST /api/auth/guest` | Create a guest cookie or recover its existing resident session. |
| `GET /api/auth/session` | Read the current authenticated actor and expiry. |
| `POST /api/auth/login` | Sign in with a seeded demo username/password. |
| `POST /api/auth/logout` | Revoke the session and clear its cookie. |
| `GET /api/operations/me` | Official-only identity endpoint. |
| `GET /api/institution/me` | Institution-only identity and assigned demo institution. |

Seeded usernames are `official`, `electricity` and `water`. Their passwords come from the corresponding `DEMO_*_PASSWORD` values in your ignored `.env`; there is no built-in password. Sessions use an HttpOnly cookie, with Secure enabled for HTTPS. New guest and staff sessions last 30 days from creation, without automatic renewal. Previously issued sessions keep their original expiry; sign in again to receive the longer staff session. Staff login replaces the current session, and logout or cookie loss ends guest recovery. Use separate browser profiles for resident and staff demonstrations. A public request cannot choose a staff role or institution.

All auth writes require an `Origin` header matching `APP_ORIGIN`. For example:

```bash
curl -i http://localhost:3000/api/health/ready
curl -i -c /tmp/smart-city.cookies -X POST \
  -H 'Origin: http://localhost:3000' \
  http://localhost:3000/api/auth/guest
curl -b /tmp/smart-city.cookies http://localhost:3000/api/auth/session
```

Requests use the [API contract](docs/api-contract.md#backend-foundation-implemented). Database outages produce a safe unavailable response; failed login attempts are limited per username and persist across app restarts. Health/session endpoints return no provider keys, passwords or session tokens in their JSON.

## Production image and configuration

`npm start` builds and runs the base production Compose configuration with the same migration/seed ordering and validation. Set `APP_ORIGIN` to the real HTTPS origin first. The app binds to loopback on `APP_PORT` (default 3000). The base Compose file keeps the database on durable storage and restarts long-running containers.

For Scaleway, follow the [deployment and recovery runbook](deploy/README.md). `npm run deploy:check` validates production settings; `npm run deploy` builds revision-tagged images, backs up PostgreSQL before migrations, then starts the application with Caddy HTTPS. `npm run deploy:backup` and `npm run deploy:restore-check -- /absolute/backup.dump` exercise backup and scratch recovery. These commands require a prepared host and configured DNS; providing them does not establish a live deployment. The deployment uses its own `mradar` Compose project, separate from local development.

Runtime secrets are passed into containers, not baked into the image. Only the one-shot setup container receives demo seed passwords. The app accepts either `DATABASE_URL` or all five standard connection variables (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`); Compose supplies the latter so passwords do not need URL escaping. Direct host development can use the same configuration in `apps/frontend/.env.local`, then run `npm run db:setup` and `npm run dev` there against a reachable PostgreSQL database.

## Independent search provider setup

The real Qdrant/local embedding adapter can be initialized separately:

```bash
docker compose -f compose.search.yaml up -d qdrant
docker compose -f compose.search.yaml run --build --rm search-setup
```

This creates a persistent index and warms a pinned multilingual CPU model; first startup downloads about 130 MiB. No cloud account is required. It does not index application records or expose a search API. Source synchronization, safe result hydration, HTTP/MCP routes and normal app/worker deployment integration remain in [#32](https://github.com/delve-group/smart-city/issues/32). See the [search guide](docs/knowledge-base/qdrant-search.md) for configuration, verified behavior and limits.

## Checks and next work

The remaining work is assigned across three computers: **Rafal** handles citizen/ElevenLabs, **Franek** handles incident response/staff, and **agent-3** is reserved for the user's machine for search, decision-maker and deployment. See the [live backlog and starting tasks](docs/knowledge-base/parallel-delivery.md) and use the [repo-local development skill](.agents/skills/mradar-development/SKILL.md) for implementation and PR handoffs.

Install host dependencies once with `npm --prefix apps/frontend ci`, then run `npm run lint`, `npm run typecheck` and `npm run build` from the repository root. Follow [AGENTS.md](AGENTS.md) for manual checks; no test suite is introduced.

This is the shared starting point for the assigned GitHub Issues: persistent report/incident APIs, ElevenLabs intake, Qdrant search across reports/incidents/service tickets, and Scaleway deployment. The [feature plan](specs/001-voice-incident-response/plan.md) defines their boundaries. The [durable worker](apps/frontend/src/server/jobs/README.md) now provides caller-transaction enqueue, leased attempts, bounded retries and health diagnostics. Root startup includes it; unregistered domain handlers leave work visibly parked without consuming attempts. Domain handlers, report/incident tables and authoritative workflows remain separate slices.

## Status

Proof of concept: **residents report problems in Kraków** — power outages, broken street lights, burst pipes, potholes, broken lifts, illegal dumping, smoke from illegal burning — at a precise spot on the map. The map shows open reports by category and a heatmap of where problems cluster; the detail panel shows impact, progress, the responsible service and related reports nearby.

- Search reports and places (top left), filter by category and switch light/dark mode (buttons next to search).
- "I'm affected too" on a report adds your weight instead of a duplicate report; three residents move a report to Confirmed.
- "Create a report" (bottom right): place the pin, pick a category, describe the problem, send.
- Map data still comes from `/api/categories` and `/api/reports`, clearly labelled mock routes with an in-memory store (new map reports disappear when the app restarts). The new persistent authentication does not retrofit ownership or permissions onto those legacy routes; their coordinated incident migration is a separate slice.

One neutral theme in light and dark mode; it follows the OS setting until toggled.
