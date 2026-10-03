# Knowledge base

This base holds project context and decisions; it is not the app's database or a RAG system.

| Need | Source |
| --- | --- |
| Goal, constraints, status and unknowns | [Project context](project.md) |
| Competition rules, judging stages and criteria | [Smart City competition judging](hackathon-evaluation.md) |
| Why we chose a given solution | [Decisions](decisions.md) |
| Implementing agent search, MCP ticket/incident search tools, related-ticket retrieval or shared user search | [Qdrant search decision and implementation guide](qdrant-search.md) — read before implementation |
| Map sources, WMS/WFS, buildings, parcels and 3D | [Geospatial data and Geoportal](geospatial-data.md) |
| Module boundaries, data flow, libraries and scaling | [Architecture](../architecture.md) |
| Components, colours, typography and accessibility | [Design system](../design-system.md) |
| Voice intake, reports vs incidents, actor tools and Spec Kit preparation | [Voice and incident discovery draft](../plans/2026-10-03-voice-incident-design.md) |
| Agreed initial scope | [Foundation plan](../plans/2026-10-03-foundation-design.md) |
| Coding and verification rules | [AGENTS.md](../../AGENTS.md), [frontend rules](../../apps/frontend/AGENTS.md) |

Update the document closest to the topic in the same change as the code. Separate facts, working assumptions and open questions. Record significant decisions with a date, reason and consequence; mark changed ones as superseded. Avoid logs of every action and copies of information already in configuration. Write in English.
