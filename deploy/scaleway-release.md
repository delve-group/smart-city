# Scaleway deployment record

Updated: 2026-10-03. Issue: [#24](https://github.com/delve-group/smart-city/issues/24).

The isolated VM is provisioned and its runtime installed. The application rollout, public DNS/TLS and end-to-end cloud verification are pending. This record is not a claim that the completed demo is deployed.

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
| Intended origin | `https://mradar.delvengine.com` — DNS pending |
| Security group | `e746e80d-59d0-43d5-8aed-bf48fa626cee`, stateful, inbound drop, outbound accept |
| Inbound rules | TCP 80/443 public; TCP 22 restricted to the deployment computer's current `/32` |
| Runtime | Docker Engine 29.8.2, Compose 5.6.0, Node.js 24.13.1, npm 11.8.0 |
| Application directory | `/opt/mradar` |
| Compose project | `mradar` |
| Backup directory | `/var/backups/mradar`, mode 0700 |

No database, Qdrant or application diagnostic port is opened in the Scaleway security group. A dedicated project SSH public key is registered; no existing unrelated project was changed. The VM's SSH host fingerprint was compared with the Scaleway serial-console fingerprint before administration.

Cost basis accepted before provisioning: compute **€0.04284/hour**, 40 GB storage at **€0.00013/GB/hour**, and one IPv4 at **€0.005/hour**. Total **€0.05304/hour**, approximately **€38.72 for 730 hours before tax**, excluding provider usage. Compute was confirmed against the live `fr-par-1` Instance catalog; storage/IP basis follows the [official June 2026 pricing update](https://www.scaleway.com/en/blog/a-transparent-update-on-scaleway-pricing/) and [Instance pricing](https://www.scaleway.com/en/pricing/virtual-instances/). Storage and IP continue to incur charges while retained, including when compute is powered off.

## Configuration and delivery

Docker comes from its official Ubuntu apt repository. Node.js comes from its official 24.13.1 Linux x64 archive, checked against the published SHA-256 checksum. Docker is enabled on boot. The private repository was transferred through an SSH-encrypted Git bundle; no GitHub credential was copied to the server. Subsequent transfers must use the same method or a separately configured read-only deploy key.

Production passwords were generated independently of developer passwords. The production `.env` is mode 0600 and is not committed. The deploying computer keeps a mode-0600 recovery copy under its private mRadar configuration directory. Do not paste the file or session cookies into Issues or logs.

Cloudflare requires an **A** record `mradar` pointing to `78.232.37.194`, initially DNS-only. No AAAA record is configured. Public HTTPS remains unverified until DNS points at this VM and Caddy obtains a trusted certificate.

## Verification status

- Confirmed VM image, architecture, 40 GB/5K storage and the dedicated firewall rules through Scaleway APIs.
- Confirmed SSH access, host fingerprint, official runtime installation and Docker startup on boot.
- Production `deploy:check` passed on the VM. An empty `POSTGRES_PASSWORD` was rejected by variable name before startup, without printing its value. Verified production environment mode 0600 and backup directory mode 0700.
- Application revision, migrations, provider placement, HTTPS/authentication, repeat setup, restart persistence and database recovery: pending final integrated rollout and manual checks.
- Full incident workflow, provider behavior and 15–30-user capacity: not established by provisioning; final rehearsal remains in #35.

Use the commands in the [deployment runbook](README.md) after the integrated revision is ready. Record the resulting Git revision and release JSON metadata here without copying secrets.
