---
name: mradar-development
description: Implement an assigned mRadar GitHub issue or one of its three development workstreams, coordinating contracts and dependencies across computers and delivering changes through PRs. Use for Rafal/citizen, Franek/operations, or agent-3/search-and-deployment work in this repository.
---

# mRadar development

Deliver the assigned scope as working slices of the existing application. GitHub Issues and PRs carry coordination between computers; local chat history is not a dependency.

## Select the work

Read the repository [AGENTS.md](../../../AGENTS.md), [knowledge index](../../../docs/knowledge-base/README.md), [project context](../../../docs/knowledge-base/project.md) and [delivery index](../../../docs/knowledge-base/parallel-delivery.md). Read the assigned Issue, its dependencies and linked PRs from GitHub, then inspect the current code. An issue being open does not establish that nobody has started it.

Use the assigned issue/label to select one guide:

| Workstream | Ownership label | Guide |
| --- | --- | --- |
| 1 — Citizen reporting and ElevenLabs | `Rafal` | [Citizen work](references/citizen.md) |
| 2 — Incident response and staff | `Franek` | [Operations work](references/operations.md) |
| 3 — Search, decision-maker and deployment | `agent-3`; reserved for the user's machine | [Search and deployment work](references/search-deployment.md) |

Labels route work; they are not GitHub usernames or application roles. If neither the request nor an Issue identifies a workstream, ask which one to use. Keep the other workstreams' implementation with their owners.

For a workstream request, choose its next open, unclaimed implementation Issue whose dependencies are available on `main`. Tracking Issues are checklists, not single implementation PRs. If an Issue permits independent preparation before a dependency lands, work only on that preparation and report the outstanding integration; do not close the Issue from a fixture-only demo. Optional P2 identity work follows the P1 response loop.

## Establish the boundary

Read the [feature specification](../../../specs/001-voice-incident-response/spec.md), [technical plan](../../../specs/001-voice-incident-response/plan.md), [architecture](../../../docs/architecture.md) and relevant [API contract](../../../docs/api-contract.md) sections. The [shared workflow contracts](../../../docs/workflow-contracts.md) hold the exact payloads, errors, command signatures, module owners and handoff examples every workstream integrates against. UI work also reads the design system and frontend agent rules; search work reads the Qdrant guide. Use the feature PoC as scope; the root platform vision does not add work to the Issue.

Before editing, record a concise Issue comment with the workstream, branch, planned slice, dependencies and any shared files/migration names being reserved. Re-read the Issue immediately before claiming it. If another branch already owns the same slice, coordinate there instead of duplicating it. If GitHub is unavailable, prepare local work within the assignment and report that ownership could not be recorded.

The shared-contract Issue owns the initial wire shapes and producer/consumer handoffs, published as the shared workflow contracts. For later contract changes, name affected consumers and coordinate the change in the Issue/PR before switching a live caller. Package manifests/lockfiles, API contracts, environment validation and migration names need the same coordination. Franek owns domain tables; agent-3 owns durable-job/search infrastructure. Rafal owns voice-specific session data. Reserve unique migration filenames in the Issue; check remote pending PRs as well as `main`. Never rewrite an applied migration to resolve a numbering collision.

## Implement and verify

Follow the repository's branch and integration rules. Start a fresh `<type>/<short-description>` branch from current `origin/main` for the selected slice, or continue the Issue's existing branch. Account for local changes before switching. Use the root README for local startup; each computer supplies its own ignored environment values.

Reuse existing sessions, database/configuration and response boundaries. Keep new frontend API calls in `src/api/` and domain rules in feature server modules. Preserve the working demo while replacing its contracts. Providers and labelled fixtures must remain distinguishable, including failure and stale-data states.

Run the Issue's manual acceptance cases plus the checks required by `AGENTS.md`; no automated tests are introduced during the PoC unless the user asks. Record actual evidence: commands/results, actor used, provider mode, relevant request/response behavior and limitations. Never include credentials or session tokens. Missing provider access means an integration remains unverified, even if its local adapter builds.

## Deliver through GitHub

Fetch the current PR target, integrate it and check the affected contracts/data flow, then rerun relevant validation. Resolve conflicts preserving both changes. Push only the working branch. Open a PR with the problem/result, Issue link, dependency state, validation and limitations; use a body file or a structured argument to preserve Markdown. Attach the PR to the chat when the tool is available.

Use `Closes #N` only when that PR completes the Issue's acceptance criteria; use `Refs #N` for partial slices. Keep tracking Issues open until all required children and integration checks are complete. If the PR needs unmerged code to function, retain an explicitly dependent draft PR. An independently usable, verified partial slice may merge before the parent Issue's full integration prerequisites are complete; keep the Issue open and state what remains. Before merge, check current `main` again and follow the repository's checks/review rules; never bypass them with a push to `main`.

Update the relevant source documentation and decision log when behavior or an integration decision changes. After merging, put a short handoff on the Issue: merged PR, interfaces/configuration now available, verification, and which dependent work is unblocked. Maintain the parent checklist without copying the whole task plan into chat. Stop at the scope requested by the user; report the next unblocked Issue or exact dependency when useful.
