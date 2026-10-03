# Deployed demo rehearsal

Recorded: 2026-10-03. Tracking: [#35](https://github.com/delve-group/smart-city/issues/35). **Partial: backend verified; complete browser/voice rehearsal remains open.**

## Environment and result

The run used public HTTPS at [mradar.delvengine.com](https://mradar.delvengine.com), deployed revision `4b8405a`. PostgreSQL, Qdrant/local multilingual embeddings and the single worker were real. The default rule-based proposer, utility observations and ticket connector were explicitly fictional demo integrations. The opt-in live Qwen workflow was checked separately on the local stack; production AI/MCP credentials and live browser voice were not enabled.

Three separate guest sessions submitted confirmed form drafts describing the same fictional street outage. Observation time was deliberately seven days earlier to isolate the rehearsal from existing demo incidents. The descriptions and location label explicitly identified a fictional rehearsal; this was not a reported real outage. Saved references `R-26-001009`, `R-26-001010` and `R-26-001011` grouped into one incident, `INC-26-000203`, with three distinct supporters. Replaying each submission returned its original report. Repeating affected contributions from those reporters kept support at three.

A resident approval request was denied with 403; an official approval using an old incident version returned 409. Rejecting the pending proposal created zero tickets. The official then selected Electricity again, reviewed the replacement proposal and approved it. The worker created `ELE-26-000421`; repeating the exact approval returned success and the institution inbox still contained exactly one ticket for the incident. Water read and update requests both returned 404.

Electricity advanced the ticket through acknowledgement, work started and resolution. A stale version failed at each step. Public incident status was read immediately afterward:

| Ticket transition | Public response status | Time from mutation start through stale-write check and public read |
| --- | --- | --- |
| Acknowledged | Assigned | 213 ms |
| Work started | In progress | 203 ms |
| Resolved | Resolved | 210 ms |

These are HTTP observations from the deployment computer, not active-screen refresh timings. The final worker diagnostic was healthy with 46 completed work items and no pending work. The fictional resolved incident/ticket remain available for inspecting the recorded result; future rehearsal needs a new draft/scenario.

## Bounded concurrency observation

Fifteen separate resident sessions each read the incident, performed one hybrid search (`awaria prądu` or `power outage`), then listed public incidents. The clients ran concurrently, with the three requests sequential inside each client. All **45 HTTPS requests returned 200**.

| Observation | Measured result |
| --- | --- |
| Total elapsed time | 5.485 s |
| Median request | 945 ms |
| 95th percentile request | 4,760 ms |
| Slowest request | 4,938 ms |

This single short run measures backend reads/search on the current small deployed corpus. It does not establish sustained 15-user capacity, concurrent submissions, complete browser journeys or simultaneous voice-provider capacity. The separate 1,000-source indexing/retrieval observations remain in the [search guide](knowledge-base/qdrant-search.md). No load framework or automated tests were added.

## Specification acceptance matrix

| Criterion | Evidence so far | Remaining before full acceptance |
| --- | --- | --- |
| SC-001 — Voice intake | Private ElevenLabs agent setup/settings read-back in #29; three form submissions saved in this deployed run. | Three live scripted conversations, address correction and saved-reference announcements. |
| SC-002 — Grouping | Three deployed form reports linked to one incident; local deterministic checks cover nearby water/street-light/unit cases and inclusive 300 m/60 min boundaries. | Repeat the complete voice/reference/counterexample journey on deployed integrated UI. |
| SC-003 — Approval/execution | Deployed rejection creates zero tickets; stale approval denied; approval/replay yields one ticket. Local stored assessment replay preserves execution. | Deployed interrupted connector/executor recovery and final integrated operator journey. |
| SC-004 — Public progress | Deployed acknowledgement/work/resolution and public API changes observed within 213 ms. | Five-second target measured on active resident/operator screens after #28. |
| SC-005 — Isolation | Deployed resident approval 403 and Water foreign ticket read/update 404; local real MCP checks also deny authority injection and unauthorized records. | Final integrated direct/browser checks after remaining cutovers. |
| SC-006 — Distinct support | Three deployed report owners count once each; repeated contributions leave three. | Final linked-report/contribution UI journey. |
| SC-007 — Recovery | Deployment record covers guest/report persistence and stopped-worker recovery. Local real search outage and controlled AI failure/stale-response checks preserve intake and bounded work. | Deployed voice/search/AI/observation/connector interruption and full browser draft recovery. |
| SC-008 — Public data | Scoped search and current-source hydration passed backend isolation checks; public incident uses controlled projection. | Inspect final map/search/voice UI and all public payloads together for private/unit/transcript leakage. |
| SC-009 — Usability | Persistent citizen form is deployed. | Keyboard-only review at 390/1440 px in both themes and usable fallback after actual voice failure. |
| SC-010 — Search | #32 accepted: real Polish retrieval, all kinds/uncategorized sources, filters, stale mutation/revocation/deletion and outage recovery. | Final deployed resident search UI in #33. |

The final dependencies remain Rafal's #28 incident map, #29 browser voice and #33 resident search UI. #35 and the agent-3 tracker stay open until the complete acceptance run passes. Lint/typecheck/production build passed at `2833d2d`; subsequent acceptance changes are documentation only and pass `git diff --check`.

## Operator preparation and recovery

Use the fictional `official`, `electricity` and `water` usernames with passwords from the private deployment configuration. Do not reuse developer passwords or publish them in Issues. Start a new fictional scenario rather than trying to reopen this resolved ticket as a new utility request. Keep a guest browser session for each intended distinct resident; refresh preserves its draft/reference.

Use the [Scaleway runbook](../deploy/README.md) for startup, deployment validation, backup/recovery and search reconciliation. The [release record](../deploy/scaleway-release.md) identifies the actual deployed revision and enabled providers. The [citizen scripts](knowledge-base/citizen-use-cases.md) remain the canonical voice/demo inputs. Provider setup success alone does not establish a working conversation.
