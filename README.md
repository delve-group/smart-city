# Smart City

Hackathon project: knowledge base, working rules, design system and a Next.js app built with [Appica UI](https://appica.dev/ui).

- [Agent rules](AGENTS.md)
- [Knowledge base](docs/knowledge-base/README.md)
- [Voice and incident feature specification](specs/001-voice-incident-response/spec.md) and [ElevenLabs implementation plan](specs/001-voice-incident-response/plan.md)
- [System architecture](docs/architecture.md) — includes the [libraries used](docs/architecture.md#libraries)
- [Design system](docs/design-system.md)
- [Frontend](apps/frontend) and its [agent rules](apps/frontend/AGENTS.md)
- [App tokens](apps/frontend/src/shared/styles/appica-theme.css)

## Running

Requires Node.js 20.9+.

```bash
cd apps/frontend
npm install
npm run dev
```

The app runs at http://localhost:3000. Checks in `apps/frontend`: `npm run lint`, `npm run typecheck`, `npm run build`.

## Status

Proof of concept: **residents report problems in Kraków** — power outages, broken street lights, burst pipes, potholes, broken lifts, illegal dumping, smoke from illegal burning — at a precise spot on the map. The map shows open reports by category and a heatmap of where problems cluster; the detail panel shows impact, progress, the responsible service and related reports nearby.

- Search reports and places (top left), filter by category and switch light/dark mode (buttons next to search).
- "I'm affected too" on a report adds your weight instead of a duplicate report; three residents move a report to Confirmed.
- "Create a report" (bottom right): place the pin, pick a category, describe the problem, send.
- Data comes from `/api/categories` and `/api/reports`, a demo backend with clearly labelled mock data and an in-memory store (new reports disappear when the dev server restarts).

One neutral theme in light and dark mode; it follows the OS setting until toggled.
