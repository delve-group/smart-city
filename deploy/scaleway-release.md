# Scaleway deployment record

Updated: 2026-10-03. Issue: [#24](https://github.com/delve-group/smart-city/issues/24).

The integrated demo backend is running on the isolated VM at [https://mradar.delvengine.com](https://mradar.delvengine.com). Voice integration and a measured 15–30-user rehearsal remain separate work; this record covers the deployed backend and search stack.

## Resources

| Item | Actual value |
| --- | --- |
| Project | `smart-city` — `2668b1e5-38aa-4703-b40b-f3c926410750` |
| Instance | `mradar-demo` — `7b47666f-2d44-4423-8661-04e4e25a0fba` |
| Zone | `fr-par-1` |
| Compute | DEV1-L, 4 vCPU, 8 GB RAM, x86-64 |
| OS | Ubuntu 24.04.5 LTS; marketplace `ubuntu_noble`, image `c1ec6338-fe5b-4bdc-9f86-45fda167df39` |
| Root storage | 40,000,000,000 bytes, SBS 5K IOPS, volume `25f0869a-8f43-4bc4-8430-c32523f644c5` |
| Flexible IPv4 | `78.232.37.194` — `fdf42adf-1561-4d5e-b667-2ddc55278bc3` |
| HTTPS origin | `https://mradar.delvengine.com` — public readiness verified |
| Security group | `e746e80d-59d0-43d5-8aed-bf48fa626cee`, stateful, inbound drop, outbound accept |
| Inbound rules | TCP 80/443 public; TCP 22 restricted to the deployment computer's current `/32` |
| Runtime | Docker Engine 29.8.2, Compose 5.6.0, Node.js 24.13.1, npm 11.8.0 |
| Application directory | `/opt/mradar` |
| Compose project | `mradar` |
| Backup directory | `/var/backups/mradar`, mode 0700 |

No database, Qdrant or application diagnostic port is opened in the Scaleway security group. A dedicated project SSH public key is registered; no existing unrelated project was changed. The VM's SSH host fingerprint was compared with the Scaleway serial-console fingerprint before administration.

Cost basis accepted before provisioning: compute **€0.04284/hour**, 40 GB storage at **€0.00013/GB/hour**, and one IPv4 at **€0.005/hour**. Total **€0.05304/hour**, approximately **€38.72 for 730 hours before tax**, excluding provider usage. Compute was confirmed against the live `fr-par-1` Instance catalog; storage/IP basis follows the [official June 2026 pricing update](https://www.scaleway.com/en/blog/a-transparent-update-on-scaleway-pricing/) and [Instance pricing](https://www.scaleway.com/en/pricing/virtual-instances/). Storage and IP continue to incur charges while retained, including when compute is powered off.

## Configuration and delivery

Docker comes from its official Ubuntu apt repository. Node.js comes from its official 24.13.1 Linux x64 archive, checked against the published SHA-256 checksum. Docker is enabled on boot. The initial checkout was transferred through an SSH-encrypted Git bundle; no GitHub credential was copied to the server. Its `origin` now uses public HTTPS for read-only fetches.

Production passwords were generated independently of developer passwords. The production `.env` is mode 0600 and is not committed. The deploying computer keeps a mode-0600 recovery copy under its private mRadar configuration directory. Do not paste the file or session cookies into Issues or logs.

Cloudflare has a DNS-only **A** record `mradar` pointing to `78.232.37.194` with automatic TTL. No AAAA record is configured. Public HTTPS succeeded with normal certificate validation on 2026-10-03.

The running app and worker use revision `92bfb9028fe1667178e7be2ea069c9369c1735f8`. Container image IDs at verification were `sha256:eaaf4c6385d3abc583ee47da485f04efe36cb60097ca91f8291dd44169aeab17` (app) and `sha256:b4258ae54c1acd77c7981763526b04fac37d38835aa8f442e56cc0a2cd9de5db` (worker). PostgreSQL and Qdrant use separate persistent Compose volumes. Qdrant 1.19.1 and the pinned multilingual embedding model run on the VM; the model cache has its own persistent volume. The Scaleway decision provider is now enabled with `qwen3.6-35b-a3b` and explicit `reasoning_effort: none`; its dedicated credential is supplied only to the worker in private configuration. ElevenLabs browser voice and production MCP credentials remain unconfigured. `DEMO_MODE` is off, so staff sign-in remains required.

## Verification status

- Confirmed VM image, architecture, 40 GB/5K storage and the dedicated firewall rules through Scaleway APIs.
- Confirmed SSH access, host fingerprint, official runtime installation and Docker startup on boot.
- Production `deploy:check` passed on the VM. An empty `POSTGRES_PASSWORD` was rejected by variable name before startup, without printing its value. Verified production environment mode 0600 and backup directory mode 0700.
- The cold deployment applied migrations `001_auth.sql` through `007_incident_assessments.sql`, seeded three staff accounts and fictional incidents, started healthy app/worker/database/Caddy containers and passed the public HTTPS readiness check. External `/api/health/live` and `/api/health/ready` returned 200; public keyword search returned `ready` with an indexed incident. Worker diagnostics showed all work completed after source reconciliation.
- A new guest and each seeded staff role signed in through public HTTPS. Their cookies were `Secure`, `HttpOnly`, `SameSite=Lax` and expired in approximately 30 days. Role-specific protected endpoints returned 200. A guest session survived an app/worker restart; fictional report `R-26-001007` survived an app/database/worker restart.
- With the worker stopped, fictional report `R-26-001008` remained `pending`; after restart its queued triage completed as `needs_review`. Replaying submission returned the same report. The worker was healthy afterward with 14 completed jobs and no pending work.
- Rerunning migration/seed setup applied no new migration, created no duplicate staff accounts and preserved all three stored staff password hashes. A database dump restored into a disposable database with all seven migrations and the expected actor/session tables. A fresh mode-0600 dump was copied to a private off-VM location; this is a recovery copy, not a full application restore rehearsal.
- Removing a required value was checked before deployment: validation named `POSTGRES_PASSWORD` without printing its value. Sampled deployment output, authentication responses and worker diagnostics did not expose secrets. The production `.env` remains mode 0600.
- The update to `4b8405a` rebuilt native x64 app/worker images, reran idempotent setup, reconciled ten sources and passed both public health endpoints. This release includes the persistent citizen form, explicit location lookup and draft recovery from #26.
- The native x64 deployment of `2354b82` rebuilt app/worker images, reran setup, queued 28 sources for reconciliation and passed public HTTPS readiness. A real deployed Qwen handler result cited two stored evidence records; official approval and replay produced one ticket, `ELE-26-000424`, then institution resolution reached the public API. The first automatic response remained in review; a later assessment after a new contribution succeeded. See the [rehearsal record](../docs/demo-rehearsal.md) for exact execution mode, latency and limitations.
- The deployed Qdrant outage preserved intake, guest/draft recovery and indexing retries across app/worker restart; setup/rebuild restored search. Known connector failure retried one execution key; before/after-send timeouts remained unknown across restart and reconciled without resend. Controlled model 503 and stale-response simulations also passed on the deployed database/handler, with the ordinary worker paused then restarted. No simulated outcome is presented as a real provider outage.
- The update to `92bfb90` rebuilt native x64 app/worker images, reran setup, queued 47 sources and passed HTTPS readiness. Reconciliation finished with the worker healthy, 237 completed work items and the two expected historical connector failures. Current-release operator/institution screens were manually reviewed at 390/1440 px in both themes; staff session reload, English/Polish settings, retained note and empty-rejection error were checked. Mobile keyboard header scrolling remains tracked in #58. One real institution work-started change appeared on the active operator screen within 4.889 s; this is one transition, not complete SC-004 or browser capacity evidence.
- The current map still has labelled demo/in-memory paths, and live browser voice, the complete UI rehearsal and representative 15–30-user capacity remain unverified. Those are not implied by HTTPS health.

Use the [deployment runbook](README.md) for updates and recovery. The private release JSON alongside the deployment dump records the image and migration metadata without publishing credentials.
