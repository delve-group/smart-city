# Deployed demo rehearsal

Recorded: 2026-10-03. Tracking: [#35](https://github.com/delve-group/smart-city/issues/35). **Partial: backend verified; complete browser/voice rehearsal remains open.**

## Environment and result

The run used public HTTPS at [mradar.delvengine.com](https://mradar.delvengine.com), deployed revision `4b8405a`. PostgreSQL, Qdrant/local multilingual embeddings and the single worker were real. The default rule-based proposer, utility observations and ticket connector were explicitly fictional demo integrations. That first run used disabled decision mode; the subsequent release `2354b82` enables real Scaleway Qwen assessment. Production MCP credentials and live browser voice remain unconfigured.

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

## Additional deployed recovery and model checks

A backup preceded the failure rehearsal. With Qdrant stopped, search returned 503 while fictional report `R-26-001012` committed and index retries remained stored. The guest session, saved report and submitted draft/reference survived an app/worker restart during that outage. Starting Qdrant and running provider setup/rebuild restored retrieval of the saved private source.

| Fictional connector fault | Actual deployed result |
| --- | --- |
| Known failure, `R-26-001013` | Same-key stored retry created exactly one request/ticket, `ELE-26-000422`. |
| Timeout before delivery, `R-26-001014` | Unknown state survived app/worker restart; exact-key reconciliation confirmed no request and created zero tickets. |
| Timeout after delivery, `R-26-001015` | Unknown state survived restart; lookup recovered the already delivered request as `ELE-26-000423`, with no resend. |

Temporary connector fault rows were removed and services restarted. These use the designed fictional connector fault mechanism, not a real utility outage.

The deployed three-report medium-reasoning snapshot exhausted all 2,048 output tokens on reasoning and produced no answer; low reasoning did the same. Diagnostic replay with the supported `none` setting returned a validated proposal in 1.253 s/234 tokens. The one-line fix is merged as #56 and deployed at `2354b82`, preserving validation, timeout and official approval. Live injected-instruction and unknown-responsibility checks returned review with reasoning disabled.

The next automatic three-report attempt still returned invalid output and safely left `INC-26-000208` in visible review, with no ticket. A new affected contribution changed its version. A one-shot process using the actual deployed worker image, with the ordinary worker paused, traced `handleAssessmentWork` through a real Qwen call: the response was stored as a pending proposal, cited two evidence records and took **1.572 s**, with **170 completion tokens / zero reasoning tokens**. The worker resumed and recovered the queued assessment from that stored result. Three reports plus the extra affected resident made four supporters. Official approval and replay through public HTTPS created exactly one `ELE-26-000424`; institution acknowledgement/work/resolution reached the public API in **150/117/117 ms**. This is real deployed reasoning/proposal/domain evidence, not a claim that the first unattended model request always succeeds.

The same deployed-image check preserved the executed live assessment on replay. Controlled model 503 responses exhausted three stored attempts and retained `R-26-001022` in visible review, with zero tickets. An official dispute during a simulated delayed valid response remained authoritative; the old assessment was superseded with zero proposals/tickets. These two model failure/concurrency responses were simulated; storage and domain services were real. The normal worker was restarted afterward.

Nearby water (`R-26-001024`), street-light (`R-26-001025`), apartment-only (`R-26-001026`) and unknown-scope (`R-26-001027`) deployed submissions all remained `needs_review`, with no incident link. Public search did not return their private reports. These are HTTP counterexamples; the final citizen UI/voice journey is still pending.

Missing (`R-26-001028`), stale (`R-26-001029`) and contradictory (`R-26-001030`) configured observation fixtures each created visible assessment review with zero proposals/tickets. Their stored observation state matched the configured feed; unavailable data was never treated as a zero reading or evidence for dispatch.

## Deployed staff-screen review

Current main `92bfb90` was deployed with native x64 app/worker builds, successful HTTPS readiness and completed reconciliation: the worker was healthy with 237 completed work items and the two expected historical connector failures. Chrome loaded fresh release assets before review; the staff session survived reload. English/Polish settings were present, and selecting English carried into the institution screen.

Both `/operations` and `/institution` were inspected at **1440 × 900 and 390 × 844, in light and dark**. Keyboard checks covered sign-in, operator queue tabs/rows, evidence/history expansion, map settings and theme/language selection. The operator verification dialog focused its reason field, and Escape returned focus to More decisions; no verification command was submitted. The resolved live-Qwen incident displayed its actual ticket and separate acknowledgement/work/resolution events. An unsent institution note remained through polling, theme changes and resize; empty rejection showed its explanatory field error without changing the ticket. The temporary note was cleared afterward.

The phone review found a real keyboard defect, tracked with reproduction and DOM evidence in [#58](https://github.com/delve-group/smart-city/issues/58): focusing lower content can scroll the outer fixed panel and hide its header actions. The Appica inner viewport also scrolls. This leaves the full keyboard acceptance incomplete; screenshots alone must not be interpreted as a pass. Franek owns the shared-shell correction, coordinated with Rafal's incident-map cutover. The earlier deployment-time stale-data notice retained the displayed incident; fresh current-release polling resumed without the notice after deployment.

A real institution HTTPS command moved fictional `ELE-26-000422` from acknowledged to work started. Its active operator detail and queue updated without reload. The note was visible **4.889 s after mutation start / 4.766 s after the 123 ms response**, measured using the request and browser-observation timestamps on the deployment computer. Observation/tool overhead is included, so this is an upper bound for that one displayed transition. An earlier acknowledgement also appeared, but its first observation timed out before delivery and supplies no reliable refresh timing. The ticket remains in progress. Resident-screen timing, all reference-journey transitions and representative concurrent browser/voice demand remain unverified.

## Specification acceptance matrix

| Criterion | Evidence so far | Remaining before full acceptance |
| --- | --- | --- |
| SC-001 — Voice intake | Private ElevenLabs agent setup/settings read-back in #29; three form submissions saved in this deployed run. | Three live scripted conversations, address correction and saved-reference announcements. |
| SC-002 — Grouping | Three deployed form reports linked to one incident; deployed water/street-light/unit/unknown-scope reports stay in review with no link. Local deterministic checks cover inclusive 300 m/60 min boundaries. | Repeat the complete voice/reference/counterexample journey on deployed integrated UI. |
| SC-003 — Approval/execution | Deployed rejection creates zero tickets; stale approval denied; approval/replay yields one ticket. Local stored assessment replay preserves execution. | Final integrated operator/browser journey; deployed connector retry and unknown-outcome restart/reconciliation now pass. |
| SC-004 — Public progress | Deployed acknowledgement/work/resolution and public API changes observed within 213 ms; one active operator work-started update observed within 4.889 s. | Five-second target for the complete journey on active resident/operator screens after #28. |
| SC-005 — Isolation | Deployed resident approval 403 and Water foreign ticket read/update 404; local real MCP checks also deny authority injection and unauthorized records. | Final integrated direct/browser checks after remaining cutovers. |
| SC-006 — Distinct support | Three deployed report owners count once each; repeated contributions leave three. | Final linked-report/contribution UI journey. |
| SC-007 — Recovery | Deployment record covers guest/report persistence and stopped-worker recovery. Local real search outage and controlled AI failure/stale-response checks preserve intake and bounded work. | Voice failure integration and full browser draft recovery. Missing/stale/contradictory deployed observation fixtures also pass. Deployed search/connector failures and controlled AI failure/stale checks now pass. |
| SC-008 — Public data | Scoped search and current-source hydration passed backend isolation checks; public incident uses controlled projection. | Inspect final map/search/voice UI and all public payloads together for private/unit/transcript leakage. |
| SC-009 — Usability | Persistent citizen form is deployed; operator/institution keyboard and four width/theme combinations reviewed, with retained note and validation error. | Fix mobile header scrolling (#58), repeat affected checks, and complete citizen/voice keyboard flow with usable fallback after actual voice failure. |
| SC-010 — Search | #32 accepted: real Polish retrieval, all kinds/uncategorized sources, filters, stale mutation/revocation/deletion and outage recovery. | Final deployed resident search UI in #33. |

The final dependencies remain Rafal's #28 incident map, #29 browser voice and #33 resident search UI, plus Franek's mobile keyboard correction #58. #35 and the agent-3 tracker stay open until the complete acceptance run passes. Lint/typecheck/production build passed for the integrated #56 fix and shared locale integration; the native x64 production build and HTTPS readiness passed at deployed `92bfb90`. Subsequent evidence changes are documentation only and pass `git diff --check`.

## Operator preparation and recovery

Use the fictional `official`, `electricity` and `water` usernames with passwords from the private deployment configuration. Do not reuse developer passwords or publish them in Issues. Start a new fictional scenario rather than trying to reopen this resolved ticket as a new utility request. Keep a guest browser session for each intended distinct resident; refresh preserves its draft/reference.

Use the [Scaleway runbook](../deploy/README.md) for startup, deployment validation, backup/recovery and search reconciliation. The [release record](../deploy/scaleway-release.md) identifies the actual deployed revision and enabled providers. The [citizen scripts](knowledge-base/citizen-use-cases.md) remain the canonical voice/demo inputs. Provider setup success alone does not establish a working conversation.
