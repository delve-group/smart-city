# Scaleway demo deployment

Status: runtime preparation for [Issue #24](https://github.com/delve-group/smart-city/issues/24). The repository supplies a production Compose override, HTTPS proxy and deployment/recovery commands. This document does not establish a deployed URL, provider connectivity or measured user capacity. The worker is added when [#22](https://github.com/delve-group/smart-city/issues/22) lands; the deployment command includes it when the base Compose file defines it.

## Runtime and cost basis

Use one **Ubuntu 24.04 LTS x86 Scaleway Instance** in the team's existing authorized project. Caddy handles HTTPS; the existing Next.js application and PostgreSQL run alongside one worker. Keep the existing PostgreSQL named volume and persistent Caddy certificate/configuration volumes. The application retains its loopback-only diagnostic port; PostgreSQL has no published port. No load balancer or Kubernetes cluster is needed for this demo.

Working choice: **DEV1-L, 4 vCPU / 8 GB RAM**, with approximately **40 GB storage**, because the VM also builds the Next.js image. This is a starting allowance, not a load-test result. Scaleway's PAR-1 list price checked on 2026-10-03 is **€0.04284/hour**, approximately **€31.27/month for compute**. Storage and public IPv4 are extra. A DEV1-M with 3 vCPU / 4 GB costs €0.0202/hour for compute and may suit prebuilt images. Confirm availability and the exact chosen zone's full calculator estimate before creating resources; PAR-1 pricing does not establish Warsaw availability or pricing. [Official pricing](https://www.scaleway.com/en/pricing/virtual-instances/)

Record project, zone, Instance ID, public IP, disk choice, hourly estimate and runtime revision in the release record below. This supports the planned 15-user demo and 30-user upper bound only as a sizing assumption; provider concurrency and full application load still need rehearsal. Build on the x86 VM to avoid accidentally deploying an Apple Silicon image.

Qdrant and embedding hosting remain a SEARCH/deployment integration decision. The [search guide](../docs/knowledge-base/qdrant-search.md) describes the Free Cloud candidate and inference trade-offs. The current stack does not provision either Qdrant or an embedding model. Add real required provider configuration as the corresponding integration lands; do not call a fixture an active provider.

## Prepare the host once

1. Create or select the documented Instance in the authorized project using an SSH public key. Follow [Scaleway's Instance instructions](https://www.scaleway.com/en/docs/instances/how-to/create-an-instance/). Obtain the real domain/subdomain and DNS access before claiming HTTPS is ready.
2. Use a dedicated **stateful** Scaleway security group: default inbound drop, outbound accept; permit public TCP 80/443 and TCP 22 only from the team's administration addresses. The auto-created default group can be stateless; explicitly check it. Do not allow database/search ports. [Security-group instructions](https://www.scaleway.com/en/docs/instances/how-to/use-security-groups/)
3. Point the domain's DNS A record at the VM's IPv4. Add AAAA only if IPv6 routing/firewall access is verified. No extra domain variable is needed: Caddy reads the same `APP_ORIGIN` as the application. Public ports 80 and 443 must reach this VM for automatic certificate issuance and renewal. [Caddy HTTPS](https://caddyserver.com/docs/quick-starts/https)
4. Install Docker Engine, Buildx and the Compose v2 plugin using the [official Ubuntu apt procedure](https://docs.docker.com/engine/install/ubuntu/). Docker-published ports can bypass UFW, so keep the provider security group and bind addresses correct. Install Node.js 22.14+ for the root command shortcuts; Docker supplies the application's Node runtime.
5. Verify `docker version`, `docker compose version` and `systemctl is-enabled docker`. Put a clean repository checkout in `/opt/mradar`, using a read-only GitHub deploy key or the team's existing repository access. Do not embed a GitHub token in its remote URL.
6. Copy `.env.example` to `.env`, set four independent passwords and `APP_ORIGIN=https://your-real-hostname`, then `chmod 600 .env`. Use the [root configuration guidance](../README.md#running). Never commit this file or paste it into an Issue. Create an off-repository backup directory writable only by the deployment operator; default `/var/backups/mradar`. Set optional `MRADAR_BACKUP_DIR` to another absolute off-repository directory if needed.

The deployment uses Compose project **`mradar`**, keeping it separate from the local `smart-city` project. An optional `COMPOSE_PROJECT_NAME` overrides that name; keep it stable for all deployment and recovery commands. Changing it creates different volumes. Never point two app/worker stacks at the same live database during a restore.

## Deploy and operate

Run from the repository root on the VM:

```bash
git fetch origin main
git switch --detach origin/main
npm run deploy:check
npm run deploy
```

Use one deployment operator at a time. `deploy:check` validates the existing required environment values, production HTTPS hostname and merged Compose configuration without printing secrets. It does not check DNS, certificates or provider access. Do not use plain `docker compose config` in logs: it prints resolved environment secrets.

`deploy` requires a clean committed checkout and performs this sequence:

1. Tag/build the app and setup images by the current Git revision while the old app keeps running. Validate the pinned Caddy configuration.
2. Start or reuse PostgreSQL without recreating an existing database container. Stop the application and, when present, worker for a short maintenance window.
3. Save a PostgreSQL custom-format dump and a release JSON file outside the repository. A backup failure aborts before migrations.
4. Run migration/seed using the newly built setup image. A migration failure leaves writers stopped for inspection rather than guessing a safe rollback.
5. Start the new app, optional worker and Caddy; wait for container readiness and the public HTTPS readiness endpoint. Save revision, image IDs, applied migrations and readiness time beside the dump.

The proxy stores certificate state in named volumes and forwards to `app:3000` on the Compose network. It uses the official pinned Caddy image, automatic HTTP-to-HTTPS redirects and bounded container logs. A container's `localhost` would refer to that container, so it is not the proxy target. [Caddy Docker setup](https://caddyserver.com/docs/running#docker-compose)

```bash
npm run deploy:status
npm run deploy:logs
npm run deploy:backup
npm run deploy:restore-check -- /var/backups/mradar/ACTUAL_BACKUP.dump
```

These commands use the same project/Compose files/environment validation. `deploy:logs` follows the latest 100 log lines; stop it with Ctrl-C. Ordinary container restarts preserve the named volumes. To restart an existing app without replacing its image:

```bash
docker compose -p mradar restart app
```

Add `worker` after it is implemented, and use your configured project name if overridden. Check health and pending work after a restart; a process restart alone does not establish job recovery. Existing database containers are intentionally not replaced by `deploy`; plan database image maintenance separately, with a backup and a restore rehearsal first. Never run `down -v` or volume-pruning commands against the demo stack.

## Backup and recovery

The backup command uses PostgreSQL 17 `pg_dump` inside the database container, writes a new mode-0600 custom-format dump and removes a partial dump if the command fails. Copy backups and their release JSON off the VM through a private channel such as SCP. They contain private report/session data. A backup on the same VM only helps with application mistakes, not VM/storage loss. Named volumes preserve data across container replacement; they are not backups. [PostgreSQL dump/restore](https://www.postgresql.org/docs/17/backup-dump.html), [Docker volume lifecycle](https://docs.docker.com/engine/storage/volumes/)

`deploy:restore-check` creates a randomly named disposable database, restores the given dump with errors treated as failures, reads the migration ledger and actor/session counts, then drops **only that scratch database**. It never replaces `smart_city`, starts an app against the copy or executes provider jobs. Use a recent backup containing known records; compare the counts and migration names with the source. After domain/jobs are delivered, also verify a known saved reference and pending job in an isolated application rehearsal before marking #24 complete.

For an actual data recovery, stop all app/worker writers, preserve the damaged database and restore into a fresh PostgreSQL volume/database first. Verify that recovery copy before switching the application to it. Use the code revision recorded for the backup, matching environment secrets and provider configuration. Only one worker may consume the recovered jobs. Restoring an old backup discards later writes, so choose the recovery point deliberately. Rebuild Qdrant from restored PostgreSQL through SEARCH's eventual reindex command; a search-index snapshot is not the primary database.

For a **code rollback with compatible migrations**, retain the previous `mradar-app:<revision>` image shown in the release JSON, check out that clean previous revision, and start that image without running migrations again:

```bash
# Replace PREVIOUS_REVISION with the full recorded Git commit, not a branch name.
git switch --detach PREVIOUS_REVISION
MRADAR_REVISION=PREVIOUS_REVISION docker compose -p mradar \
  -f compose.yaml -f compose.scaleway.yaml \
  up -d --no-deps --no-build --wait app
```

Include the corresponding worker image/service once implemented. Check public health and authentication again. Do not use `npm run deploy` for a schema-incompatible rollback: it runs the selected revision's setup. Prefer additive migrations during the hackathon. If old code cannot read the new schema, use the explicit backup recovery above or a forward fix; never automatically reverse applied SQL migrations.

## Release checklist and remaining evidence

The script's release JSON records technical build/database evidence. Maintain a short deployment record with the following actual observations; leave unknowns explicit:

- Scaleway project/zone/Instance, selected resources and complete cost estimate; HTTPS URL; deployed commit and image IDs; database migration list.
- Enabled provider modes and non-secret model/agent identifiers, including Qdrant/embedding locations and ElevenLabs settings. Never paste keys, passwords or cookies.
- External `GET /api/health/live` and `GET /api/health/ready`; guest creation/recovery; each seeded staff role; cookie `Secure`, `HttpOnly`, `SameSite=Lax` and 30-day expiry. Use browser DevTools or a private temporary cookie jar, without publishing tokens.
- Safe rerun of setup, unchanged existing staff passwords, persistence after app/database/worker restart and pending-job recovery without duplicate writes. The current mock map is still in-memory and is not evidence of saved domain records.
- A deliberately missing required value fails startup by variable name without a secret leak; inspect ordinary logs and network responses.
- Successful scratch restore plus domain/job recovery rehearsal once those features exist; separate measurement of application and voice concurrency.

Worker recovery, live domain/provider paths, the deployed HTTPS URL and measured capacity remain acceptance work in #22/#24/#35. Building these files locally does not close those checks.
