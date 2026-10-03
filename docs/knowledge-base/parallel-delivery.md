# Parallel delivery

Updated: 2026-10-03. Ownership is agreed; implementation is tracked on GitHub. The local backend and 30-day sessions are already delivered.

## Workstreams

| Computer | Owner label | Scope | Tracking Issue |
| --- | --- | --- | --- |
| 1 — Rafal | `Rafal` | Citizen form/map, location and ElevenLabs | [#18](https://github.com/delve-group/smart-city/issues/18) |
| 2 — Franek | `Franek` | Authoritative incident response and staff/institution UI | [#19](https://github.com/delve-group/smart-city/issues/19) |
| 3 — User's machine | `agent-3` | Qdrant, decision-maker/MCP, worker and Scaleway | [#20](https://github.com/delve-group/smart-city/issues/20) |

Labels are routing tags, not GitHub assignees or application roles. GitHub Issue/PR state is the source of truth for claims, progress and blockers; the table below is a navigation index.

## Start on each computer

Pull current `main`, follow the root README for local startup, and use the [repo-local skill](../../.agents/skills/mradar-development/SKILL.md). Give the agent its workstream and Issue number. The skill links the relevant role guide and canonical specification; no other computer's chat history is needed.

- **Franek:** [#21](https://github.com/delve-group/smart-city/issues/21), [#23](https://github.com/delve-group/smart-city/issues/23), [#25](https://github.com/delve-group/smart-city/issues/25), [#27](https://github.com/delve-group/smart-city/issues/27) and [#31](https://github.com/delve-group/smart-city/issues/31) are delivered. Independent server/category cutover review and local staff HTTP/fixture UI evidence are merged in [#65](https://github.com/delve-group/smart-city/pull/65). Remaining: forced stale-save/error retention, real-backend staff browser transitions/display timing and defects found in the integrated rehearsal; see [#19](https://github.com/delve-group/smart-city/issues/19) and the [staff evidence](../local-staff-rehearsal.md).
- **User's machine / agent-3:** [#22](https://github.com/delve-group/smart-city/issues/22) and [#24](https://github.com/delve-group/smart-city/issues/24) are delivered. Scoped search #32 and decision-maker/MCP #34 have integrated backend acceptance recorded in their module guides. Continue [#35](https://github.com/delve-group/smart-city/issues/35), integrating Rafal’s map, voice and search UI as they land.
- **Rafal:** [#26](https://github.com/delve-group/smart-city/issues/26), [#28](https://github.com/delve-group/smart-city/issues/28) and [#33](https://github.com/delve-group/smart-city/issues/33) are merged and closed. [#29](https://github.com/delve-group/smart-city/issues/29) remains open: draft [#63](https://github.com/delve-group/smart-city/pull/63) implements browser voice and five owned tools, with local Polish speech/clarification evidence after D064. Complete scripted saved reports and remaining lifecycle/failure acceptance still need verification. No fixture-only completion claims.

Example prompts:

```text
Use $mradar-development for workstream 1 / Rafal. Implement the next unblocked Issue.
Use $mradar-development for workstream 2 / Franek. Continue the remaining staff acceptance in Issue #19; its implementation children are delivered.
Use $mradar-development for workstream 3 / agent-3 on my machine. Continue the integrated rehearsal in Issue #35 after its listed dependencies land.
```

If skill discovery has not refreshed after pulling, explicitly ask the agent to read `.agents/skills/mradar-development/SKILL.md`; the root AGENTS.md also links it.

## Implementation index

| Issue | Owner | Deliverable | Integration prerequisites |
| --- | --- | --- | --- |
| [#21](https://github.com/delve-group/smart-city/issues/21) | `Franek` | Agree shared workflow contracts and migration handoffs | None |
| [#22](https://github.com/delve-group/smart-city/issues/22) | `agent-3` | Add durable PostgreSQL jobs and one supervised worker | [#21](https://github.com/delve-group/smart-city/issues/21) |
| [#23](https://github.com/delve-group/smart-city/issues/23) | `Franek` | Persist owned drafts and idempotent resident report intake | [#21](https://github.com/delve-group/smart-city/issues/21), [#22](https://github.com/delve-group/smart-city/issues/22) |
| [#24](https://github.com/delve-group/smart-city/issues/24) | `agent-3` | Deploy the simple demo stack on Scaleway and document recovery | [#22](https://github.com/delve-group/smart-city/issues/22) |
| [#25](https://github.com/delve-group/smart-city/issues/25) | `Franek` | Add deterministic incident triage and public incident APIs | [#23](https://github.com/delve-group/smart-city/issues/23) |
| [#26](https://github.com/delve-group/smart-city/issues/26) | `Rafal` | Connect citizen reporting and location confirmation to persistent intake | [#21](https://github.com/delve-group/smart-city/issues/21), [#23](https://github.com/delve-group/smart-city/issues/23) |
| [#27](https://github.com/delve-group/smart-city/issues/27) | `Franek` | Build official review, versioned approval and exactly-once demo ticket execution | [#25](https://github.com/delve-group/smart-city/issues/25), [#22](https://github.com/delve-group/smart-city/issues/22) |
| [#28](https://github.com/delve-group/smart-city/issues/28) | `Rafal` | Migrate the resident map and contributions to public incidents | [#21](https://github.com/delve-group/smart-city/issues/21), [#25](https://github.com/delve-group/smart-city/issues/25), [#26](https://github.com/delve-group/smart-city/issues/26) |
| [#29](https://github.com/delve-group/smart-city/issues/29) | `Rafal` | Add ElevenLabs browser voice intake with shared draft recovery | [#21](https://github.com/delve-group/smart-city/issues/21), [#23](https://github.com/delve-group/smart-city/issues/23), [#25](https://github.com/delve-group/smart-city/issues/25), [#26](https://github.com/delve-group/smart-city/issues/26) |
| [#30](https://github.com/delve-group/smart-city/issues/30) | `Rafal` | P2: Add clearly labelled fictional resident identity selection (optional) | [#21](https://github.com/delve-group/smart-city/issues/21), [#26](https://github.com/delve-group/smart-city/issues/26) |
| [#31](https://github.com/delve-group/smart-city/issues/31) | `Franek` | Deliver the scoped institution inbox and resolution updates | [#27](https://github.com/delve-group/smart-city/issues/27) |
| [#32](https://github.com/delve-group/smart-city/issues/32) | `agent-3` | Implement scoped Qdrant search for reports, incidents and service tickets | [#21](https://github.com/delve-group/smart-city/issues/21), [#22](https://github.com/delve-group/smart-city/issues/22), [#23](https://github.com/delve-group/smart-city/issues/23), [#25](https://github.com/delve-group/smart-city/issues/25), [#27](https://github.com/delve-group/smart-city/issues/27), [#31](https://github.com/delve-group/smart-city/issues/31) |
| [#33](https://github.com/delve-group/smart-city/issues/33) | `Rafal` | Connect resident search to the shared scoped incident search API | [#28](https://github.com/delve-group/smart-city/issues/28), [#32](https://github.com/delve-group/smart-city/issues/32) |
| [#34](https://github.com/delve-group/smart-city/issues/34) | `agent-3` | Add the bounded decision-maker workflow and scoped MCP adapters | [#22](https://github.com/delve-group/smart-city/issues/22), [#32](https://github.com/delve-group/smart-city/issues/32), [#25](https://github.com/delve-group/smart-city/issues/25), [#27](https://github.com/delve-group/smart-city/issues/27), [#31](https://github.com/delve-group/smart-city/issues/31) |
| [#35](https://github.com/delve-group/smart-city/issues/35) | `agent-3` | Integrate and rehearse the complete deployed response loop | [#26](https://github.com/delve-group/smart-city/issues/26), [#28](https://github.com/delve-group/smart-city/issues/28), [#29](https://github.com/delve-group/smart-city/issues/29), [#33](https://github.com/delve-group/smart-city/issues/33), [#31](https://github.com/delve-group/smart-city/issues/31), [#34](https://github.com/delve-group/smart-city/issues/34), [#24](https://github.com/delve-group/smart-city/issues/24) |

The dependency graph describes complete integration. An Issue may explicitly permit provider/configuration/UI preparation earlier. Keep incomplete work visible and retain current callers until the coordinated cutover.

## Integration boundaries

Exact payloads, signatures, migration stages and reserved migration filenames live in the [shared workflow contracts](../workflow-contracts.md); the points below are the summary.

- Franek owns one durable draft/report submission service for both form and voice. Rafal owns the browser/provider adapters and complete migration of existing report-map callers to public incidents.
- Agent-3 owns transaction-aware work storage and the single worker. Franek commits source mutations and pending work atomically and supplies deterministic business handlers. The worker facility is verified independently first; real handler outcomes are verified by their domain/search Issues.
- Franek owns authoritative permissions, grouping, proposals, approvals and execution. Agent-3's LLM/MCP invokes these services; it cannot grant itself approval.
- Franek supplies permitted source projections. Agent-3 indexes all reports/incidents/tickets by type/ID/version and rechecks current access; Rafal consumes public search.
- Reserve migration filenames and shared config/contract edits in the Issue before work. Follow the skill and AGENTS.md for branches, integration, checks, PRs and handoffs.

The complete deployed response loop is tracked, and remains incomplete, in [#35](https://github.com/delve-group/smart-city/issues/35). [Local capacity evidence](../local-capacity-rehearsal.md) covers bounded keyword HTTP reads, not full browser/voice or deployed capacity. The optional identity simulation in [#30](https://github.com/delve-group/smart-city/issues/30) follows the P1 work and is not a gate for the demo. Creating this backlog does not provision Scaleway or validate provider capacity.
