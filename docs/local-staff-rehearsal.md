# Local staff response rehearsal

Recorded: 2026-10-03. Partial acceptance evidence for [#19](https://github.com/delve-group/smart-city/issues/19) and [#35](https://github.com/delve-group/smart-city/issues/35). Work ran in an isolated worktree on `feature/franek-takeover`, initially based on `f596f8f`, then integrated with `895c5a8` after the primary thread merged #51 and `b537360` after #62. No application behavior was changed and no automated tests were added.

## Separation and provider mode

Real backend checks used the existing `http://localhost:3000` Docker app, PostgreSQL and worker. Resident, official, Electricity and Water each had an independent HTTP cookie jar; no browser staff login replaced the primary thread's resident session. The shared stack was neither restarted nor deployed. The rule-based proposer, utility observation and institutional connector were fictional demo integrations. This does not verify a real utility or a live AI assessment.

UI checks used a separate `npm --prefix apps/frontend run dev:ui -- --port 3002 --hostname 127.0.0.1` process and agent-created Chrome tabs at `http://127.0.0.1:3002`. These screens used browser fixtures, not the PostgreSQL backend. No staff password was entered in the browser. Capacity work in [#64](https://github.com/delve-group/smart-city/pull/64) was not repeated.

## Independent #51 compatibility review

GitHub approval was submitted for `a24833d4f6937396cf2ad4c966ff51966a762e4b`. The later `cd5c2807d0aacbf8537750b8578c61a1f0e42a1b` head was also approved after verifying its delta contained only the integrated capacity documentation/script. The primary thread performed the merge.

- The category producer and shared decoder both use `data` and `correlation_id`; the route sets `Cache-Control: no-store`. Operations and institution hooks use the same category client.
- Both retired legacy routes return common-envelope `410 endpoint_retired`: `GET /api/reports` and `POST /api/reports/{id}/confirmations`.
- `GET /api/reports/{id}` preserves its owner/official boundary. Canonical `POST /api/reports { draft_id, revision }` still uses the shared resident-only, confirmed-draft service.
- Deleted legacy store/types have no remaining imports on the reviewed head. Moved Kraków bounds and severity values are unchanged.
- Independently ran `npm run lint`, `npm run typecheck` and `npm run build` on the exact `a24833d` head: all passed. HTTP checks below were against the existing integrated local stack, not a separately started exact-head backend.

## Real HTTP and PostgreSQL evidence

The resident submitted a clearly fictional street-outage observation at a unique fictional street and an old known observation timestamp, avoiding grouping with earlier rehearsals. Report `R-26-001022` (`1f2711c8-e499-4ca9-8687-0c4a37dc927b`) triaged into `INC-26-000209` (`d1591cf5-9e0c-4423-ba0b-de531c47663c`).

| Manual operation | Observed result |
| --- | --- |
| Independent guest and three seeded staff sessions | Guest `201`; staff login and scoped workspace/inbox reads `200` |
| Submit unconfirmed draft | `409` |
| Confirm current draft; submit; repeat identical submission | `200`; `201`; `200`, same report ID/reference |
| Owned report read; obsolete raw-create body | `200`; `400 legacy_contract_retired` |
| Resident proposal approval | `403 forbidden` |
| Approval with incorrect proposal version or old incident version | Both `409 stale_approval` |
| Empty rejection reason | `400 invalid_request` |
| Reject pending proposal | `200`, proposal rejected, no ticket |
| Choose Electricity again | `200`, fresh pending proposal |
| Approve, immediately replay approval, replay after worker execution | All `200`; original ticket retained |
| Water reads or updates Electricity's ticket | Both `404 not_found` |
| Resident reads institution ticket | `403 forbidden` |
| Electricity acknowledges, starts work, resolves with a fictional result note | Each `200`; ticket versions 2, 3, 4 |
| Repeat each transition with its old version | Each `409 version_conflict` |
| Replay exact approval after each progress step | Each `200`; no new ticket |

The worker created `ELE-26-000424` (`d297558d-36e4-4607-ab61-320ee25165f1`). After resolution, a one-off invocation of `executeApprovedProposal` inside the existing worker container returned `status: executed`, the same ID/reference and `replayed: true`. This did not restart or modify the worker. A read-only PostgreSQL query then confirmed **one ticket and one ticket proposal** for this incident, with ticket `status: resolved`, `version: 4`.

Public incident reads showed `assigned` after acknowledgement, `in_progress` after work started and `resolved` after resolution. The public timeline contained `reported`, `assigned`, `acknowledged`, `work_started`, `resolved`. The unique marker from the private report narrative did not appear in these public responses. This is a narrow marker check, not a replacement for the broader privacy rehearsal in [local-response-rehearsal.md](local-response-rehearsal.md).

## Mocks-only UI evidence

Both `/operations` and `/institution` were checked at **390 × 844** and **1440 × 900**, in light and dark themes, with Polish controls and fictional English fixture content. Viewport dimensions and active theme were read back from the DOM.

| Surface | Checks completed in all four width/theme combinations |
| --- | --- |
| Official pending proposal | Rejection textarea and action buttons reachable with Tab; typed reason retained through visible polling, width and theme changes; panel shell `scrollTop` remained 0; no document horizontal overflow |
| Institution created ticket | Note and acknowledgement/rejection buttons reachable with Tab; unsaved note retained through visible polling, width and theme changes; panel shell `scrollTop` remained 0; no document horizontal overflow |

At 390 px, focusing the lower actions scrolled the inner viewport while the category/header actions stayed visible. Screenshots visually confirmed the phone and desktop layouts. On the official screen, keyboard activation of Reject focused the reason field; an empty submission showed inline validation. Opening a verification dialog and pressing Escape closed the dialog, retained the incident panel and returned focus to its decisions menu. A second fixture official tab approved the pending proposal through the keyboard; the fixture institution inbox subsequently displayed its new assigned ticket. That browser ticket is separate from `ELE-26-000424` above.

## Verification limits and handoff

No concrete staff/domain defect was found in these completed cases, so this slice delivers evidence only. After integration with `895c5a8` and again with `b537360`, `npm run lint`, `npm run typecheck` and `npm run build` all passed. `git diff --check` also passed. No automated tests were added.

- Browser control disconnected while preparing additional concurrent-tab checks. **Stale-save/network-failure UI feedback and retention were not forced in this run.** HTTP stale-version behavior passed, and ordinary fixture polling retained input; those are separate claims.
- The final integrated-main UI was not re-reviewed after #51 merged. Its staff implementation is unchanged, and the updated category consumer compatibility was reviewed and compiled, but this is not real-backend browser acceptance.
- This run does not establish the five-second display target, complete institution browser acknowledgement/work/resolution, live voice/AI behavior, connector outage recovery, deployment acceptance or capacity.
- The browser interruption prevented confirming viewport-reset cleanup. Only agent-created mock tabs were used; the primary resident tab was not operated or authenticated as staff.

The primary thread owns final integration, browser/deployed rehearsal and merges. Keep #19 and #35 open for the remaining acceptance; this evidence alone does not complete them.
