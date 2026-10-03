# Knowledge base

This base holds project context and decisions; it is not the app's database or a RAG system.

| Need | Source |
| --- | --- |
| Goal, constraints, status and unknowns | [Project context](project.md) |
| Three-computer ownership, GitHub backlog and repo-local development skill | [Parallel delivery](parallel-delivery.md) |
| Actual deployed/local rehearsal evidence, remaining acceptance and operator preparation | [Demo rehearsal](../demo-rehearsal.md), [local response loop](../local-response-rehearsal.md), [staff acceptance](../local-staff-rehearsal.md), [bounded local capacity](../local-capacity-rehearsal.md) |
| Competition rules, judging stages and criteria | [Smart City competition judging](hackathon-evaluation.md) |
| Why we chose a given solution | [Decisions](decisions.md) |
| Citizen report scripts for manual testing, voice rehearsals and demo videos | [Selected citizen use cases](citizen-use-cases.md) |
| Implementing agent search, MCP ticket/incident search tools, related-ticket retrieval or shared user search | [Qdrant search decision and implementation guide](qdrant-search.md) — read before implementation |
| Resident search controls, public results and map/place fallback | [Resident search](../resident-search.md) |
| Private voice provider setup and owned session/tool API | [Dispatcher setup](../voice-dispatcher.md), [voice sessions](../voice-sessions.md) |
| Map sources, WMS/WFS, buildings, parcels and 3D | [Geospatial data and Geoportal](geospatial-data.md) |
| Module boundaries, data flow, libraries and scaling | [Architecture](../architecture.md) |
| Frontend–backend contract: implemented demo, specified voice-to-incident PoC and future platform | [API contract](../api-contract.md) |
| Exact payloads, errors, command signatures and cross-workstream handoffs for the PoC | [Shared workflow contracts](../workflow-contracts.md) |
| Components, colours, typography and accessibility | [Design system](../design-system.md) |
| Creating or editing HTML decks with speaker notes, presenter mode and offline export | [HTML presentations skill](../../.agents/skills/html-presentations/SKILL.md) |
| Current PoC requirements, user stories and acceptance criteria | [Voice and incident specification](../../specs/001-voice-incident-response/spec.md) |
| ElevenLabs integration, actor tools, persistence and delivery slices | [Technical implementation plan](../../specs/001-voice-incident-response/plan.md) |
| Background research and considered alternatives | [Historical discovery draft](../plans/2026-10-03-voice-incident-design.md) |
| Agreed initial scope | [Foundation plan](../plans/2026-10-03-foundation-design.md) |
| Coding and verification rules | [AGENTS.md](../../AGENTS.md), [frontend rules](../../apps/frontend/AGENTS.md) |

Update the document closest to the topic in the same change as the code. Separate facts, working assumptions and open questions. Record significant decisions with a date, reason and consequence; mark changed ones as superseded. Avoid logs of every action and copies of information already in configuration. Write in English.
