# Incident response and staff — Franek

Own authoritative draft/report/incident/evidence/contribution/action/ticket services, domain migrations and fixtures, public projections, and official/institution UI with staff login. Primary server areas are `server/reports`, `server/incidents`, `server/actions` and `server/institutions`; their HTTP routes remain thin. Reuse the existing accounts and fixed 30-day sessions.

Deliver the shared-contract Issue first. Rafal owns citizen UI, location and voice adapters; agent-3 owns the worker, Qdrant, LLM orchestration and MCP transport. Expose explicit callable domain operations and permitted source projections for those consumers, rather than creating a second implementation inside tools or route handlers.

Persist report submission and pending triage/indexing work in the same PostgreSQL transaction using the agent-3 work interface. Provider calls happen outside that transaction. The worker invokes this workstream's deterministic eligibility/version checks; an LLM suggestion never bypasses them. Keep assessment, response progress, distinct support and official verification separate.

This workstream alone owns approval/execution authority: immutable proposals, current-version official decisions, one ticket per proposal, at most one active ticket per incident, and reconciliation of unknown execution outcomes. Institution updates use the account's institution and produce the appropriate audit/public events. Responsibility/evidence fixtures remain explicitly fictional, with missing and stale observations represented honestly.

Supply public incident and scoped private record readers before their consumer integration. Preserve old report callers until Rafal's coordinated cutover; persistent private reports must never enter the old public mock list. Search adapters supplied to agent-3 return text permitted for the requested audience and current source versions.

Manual acceptance includes duplicate submission/contribution, stale versions, ambiguous/private grouping, rejected approval, repeated execution, institution isolation and the full resolution loop. The shared contract and Issue define ordering; do not block deterministic persistence/triage on live Qdrant or LLM availability.
