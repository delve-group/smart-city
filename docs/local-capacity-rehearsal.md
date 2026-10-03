# Local public-read capacity rehearsal

Partial preparation for [#35](https://github.com/delve-group/smart-city/issues/35#issuecomment-5973346217). This manually run HTTP measurement uses the existing `http://localhost:3000` application. It does not establish full browser, voice, deployed or production capacity.

## Run

Requires Node >=22.14 and an already running local application with guest sessions, PostgreSQL and keyword search available. The helper uses only Node built-ins; no installation, test framework, environment file or new configuration is needed.

```sh
node scripts/local-capacity-rehearsal.mjs > /tmp/local-capacity-rehearsal.json
```

Run from the repository checkout. Progress goes to stderr; stdout contains a JSON summary without cookies, actor IDs or response text. No arguments are accepted: the target, workload and deadlines are deliberately fixed. Exit 0 means every attempted response was valid, search reported `ready`, and no warm schedule slot was skipped. Exit 1 means failed setup, an HTTP/transport/validation error, timeout, `index_stale`, or missed warm slots; inspect the counters rather than treating that exit code as a capacity threshold.

The only writes are 15 sequential `POST /api/auth/guest` calls with the local Origin. They create distinct resident actors and 30-day sessions in the existing database; no reports, contributions, drafts, tickets or indexing work are created. Cookies stay in process memory. Sessions are not deleted or revoked afterward, so repeat runs add 15 guest actors/sessions each. Setup failures stop the read phases without automatic retries.

## Workload and measurement

- **First observed:** three sequential waves, each with 15 concurrent requests, for incidents, categories and search respectively (45 total). This measures initial traffic from this helper, including any route initialization it encounters. It is not a guaranteed cold application/model/cache measurement: the shared stack stays running and may have served earlier traffic.
- **Warm:** a 30-second window with one request per resident per second, rotating incidents → categories → search. Each endpoint is read every three seconds per resident. There are 450 scheduled slots: 150 per endpoint, 15 requests/second overall. Residents start together, producing bursts of at most 15 in-flight requests. This deliberately small fixed mix is a rehearsal assumption, not a captured browser traffic profile.
- Every resident has at most one request in flight. Slow requests skip scheduled slots; the helper never catches up with extra bursts. It records skipped slots and scheduling lag. No new request starts after the warm window; existing requests drain within their deadlines. The warm elapsed time includes that drain.
- Every request has a 10-second deadline covering connection, headers and body consumption, with redirects rejected. Timeouts, HTTP errors, invalid responses and transport errors have separate counters. HTTP status counts are also recorded when headers arrive, even if the body later times out.
- Latency runs from dispatch through complete body decoding/validation. p50/p95 use nearest-rank percentiles; maximum and percentiles include all attempts, including failures/timeouts. They exclude setup/think time/slot wait. A timeout measures client abandonment, not confirmation that server work stopped.

Reads are restricted to:

| Endpoint | Parameters / validation |
| --- | --- |
| `GET /api/incidents` | `limit=200`; common success envelope, public incident allowlisted keys, field types, status enums, timeline, coordinates and timestamps. Item counts, demo/live provenance and non-null cursors are reported. No detail requests or pagination traversal. |
| `GET /api/categories` | Nonempty valid catalogue with unique IDs. The common `{data, correlation_id}` envelope and current-main legacy `{categories}` demo catalogue are explicitly recognized and counted separately. Arbitrary HTTP 200 JSON is rejected. |
| `GET /api/search/records` | `mode=keyword&limit=10&record_type=incident`; queries rotate evenly through `power outage`, `burst pipe`, `zzzz-capacity-no-match`. Common envelope, `ready`/`index_stale`, incident-only allowlisted hits, source versions, scores and timestamps. Empty results are valid; stale results are structurally valid but reported as degraded and produce exit 1. |

The validators mirror the public shapes in [workflow contracts](workflow-contracts.md#9-search-source-projections) and the existing API clients. They do not import application code or add schema dependencies. Keyword search uses existing local Qdrant lexical retrieval and current PostgreSQL hydration; it does not call an embedding model, ElevenLabs, AI or location providers. Semantic/hybrid search remains unmeasured. A legacy category success is explicitly a validated demo catalogue, not evidence of the common-envelope map cutover.

## Recorded local evidence — 2026-10-03

Final run: **20:53:52.173–20:54:22.766 UTC** (22:53–22:54 Europe/Warsaw), exit **0**. Fifteen distinct guest sessions returned valid HTTP 201 responses (setup p50 7.1 ms, p95/max 53.3 ms). All **495 public reads** returned HTTP 200 and passed application validation. Timeouts, HTTP errors, invalid responses and transport errors were **0 in every phase/endpoint**.

| Phase | Endpoint | Valid / attempted | p50 ms | p95 ms | Max ms |
| --- | --- | --- | --- | --- | --- |
| First observed | Incidents | 15 / 15 | 73.2 | 79.3 | 79.3 |
| First observed | Categories | 15 / 15 | 24.5 | 74.1 | 74.1 |
| First observed | Keyword search | 15 / 15 | 225.1 | 270.4 | 270.4 |
| Warm | Incidents | 150 / 150 | 74.7 | 97.3 | 103.3 |
| Warm | Categories | 150 / 150 | 54.3 | 305.4 | 324.8 |
| Warm | Keyword search | 150 / 150 | 227.3 | 274.7 | 298.2 |

The first-observed waves took **428 ms**. Warm elapsed time including drain was **30,001 ms**, with **450/450 scheduled requests**, **0 skipped slots**, maximum scheduling lag **12.1 ms**, and maximum **15 in flight**. Every incident response contained **8 demo incidents** with no next cursor; every category response contained **8 categories** using the common envelope (165 common, 0 legacy). All **165 search responses were `ready`**, with 0 `index_stale`. Each query ran 55 times across the two phases: `power outage` returned 7 hits, `burst pipe` 1 hit, and `zzzz-capacity-no-match` 0 hits every time. These validate both nonempty and empty application responses, not search relevance/completeness.

Provenance and corpus:

- Helper branch: `feature/local-capacity-rehearsal`, based on fetched `origin/main` **f596f8f35a89c15ed6d21271b6a8ab00ea25b5ea**; the measurement JSON reports that checkout revision. The helper was an uncommitted addition at measurement time; its final source is delivered in this PR.
- Running app: existing `smart-city-app-1`, **development mode** (`npm run dev -- --hostname 0.0.0.0`), started **20:37:25 UTC**. Image **sha256:a263880c0f03360f39a5ae67ff23753ee7e1978d1a78780a5e0053a56b29cf2b**, created **20:18:34 UTC**, with live source mounted from the primary checkout. No restart was performed.
- Mounted checkout was on `feature/browser-voice` at **20b7d777e68938f054f2d55caff3d009c14e6e15** before/after the final run, with uncommitted intake/voice edits. It includes unmerged map/search/voice integration. Its source is not the immutable helper/main revision. Before the run, content comparisons matched current main for the guest/incident/search routes, session/cookie modules, public incident projection and search service/Qdrant module; the category route differed because the map branch already uses the common envelope. **This is evidence for that shared running app, not a clean-main or deployed runtime acceptance claim.**
- Read-only PostgreSQL snapshots at **20:53:51.727632 UTC** and **20:54:22.900129 UTC** both counted **17 reports, 8 incidents, 3 service tickets**. Qdrant `mradar_records_v1` reported **39 total projection points, 8 public incident points** immediately afterward. Projection points are not distinct domain records. No dataset was seeded or enlarged by this helper.
- Host: Apple M1 / arm64, 8 CPUs, 16 GiB RAM, macOS Darwin 25.5.0; host Node **v24.13.1**. Docker reported 8 CPUs and **8,218,316,800 bytes** memory allocation. PostgreSQL image was `postgres:17-bookworm`; Qdrant was `qdrant/qdrant:v1.19.1`.

An earlier exploratory helper run at **20:51:48–20:52:19 UTC** also returned 495/495 valid public reads and no errors/timeouts/skipped slots. Warm p95 was 98.3 ms incidents, 809.2 ms categories and 515.4 ms search; its first-observed search p95 was 675.0 ms. Repository checks overlapped part of that run, so the final run above was made after checks completed. Both runs used the same uninterrupted stack, adding **30 guest actors/sessions total**. A preliminary HTTP/source snapshot had only 14 reports / 7 incidents / 2 tickets; another local rehearsal increased the corpus before the recorded runs. This variation and the prior traffic preclude a controlled cold/warm comparison.

Raw final summary was written to `/tmp/smart-city-local-capacity-final.json` on the measurement host; the retained evidence is the figures and provenance above, not a dependency on that temporary file.

## Verification

- Fetched current `origin/main` again before final verification; the branch remained up to date at f596f8f. Reviewed route/query/session shapes against the existing code, including the legacy category boundary on main and the common boundary in the running app.
- `node --check scripts/local-capacity-rehearsal.mjs`, targeted ESLint for the helper, `npm run lint`, `npm run typecheck`, `npm run build` and `git diff --check` passed in the isolated worktree. Existing installed dependencies were copied into ignored worktree `node_modules`; all common locked packages matched. No manifest/lockfile or shared stack artifact was changed. An initial external dependency symlink failed Turbopack's filesystem-root restriction; replacing it with the local copy allowed the full production build to pass.
- Manually inspected the final JSON, success/nonempty/empty responses, provenance/cursor/status counters and fixed schedule. An unsupported `--help` argument was rejected before guest setup. No automated tests or framework were introduced.
- No new UI exists, so appearance, responsiveness, keyboard and theme review are outside this change. Timeout, malformed-body, dependency-outage, legacy-category and stale-index branches were reviewed in code but were **not induced against the live shared stack**. The production build passing does not change the fact that the measured runtime was development mode.

## Interpretation and limitations

This is a short public HTTP read measurement against a small local demo corpus. It measures guest-session lookups, incident reads and keyword search/hydration. It does not measure React rendering, map/WebGL/tiles, accessibility, microphone/WebRTC, voice concurrency, transcripts, form submission, official approval, institution progress, background AI work, semantic/hybrid embeddings or end-to-end status propagation. It supplies no browser latency, five-second cross-screen acceptance, 30-user upper bound, sustained-load, saturation, failure-recovery or deployed-capacity claim.

The host, Docker runtime, development compilation and other users/processes share resources. There is no isolation, stack reset or controlled cold cache. HTTP keep-alive is managed by Node fetch; simulated resident identities do not imply 15 independent browser connections. Repeated queries on a small corpus can be cheaper than varied real traffic. A valid empty search establishes response handling, not result completeness or ranking quality; an allowlist check cannot prove that string content contains no private information. Non-null incident cursors indicate that observed item counts cover only the requested page.

No application code, dependency manifest/lockfile, configuration, migration or existing rehearsal document is changed. No stack restart, deployment, provider call or automated test is part of this helper. Full #35 acceptance remains with the primary rehearsal owner; this PR uses `Refs #35` and does not merge or close that issue.
