# Smart City

Hackathon project: knowledge base, working rules, design system and a Next.js app built with [Appica UI](https://appica.dev/ui).

- [Agent rules](AGENTS.md)
- [Knowledge base](docs/knowledge-base/README.md)
- [System architecture](docs/architecture.md) — includes the [libraries used](docs/architecture.md#libraries)
- [Design system and both themes](docs/design-system.md)
- [Theme preview](design-system/preview.html) — open the file in a browser; no install needed.
- [Frontend](apps/frontend) and its [agent rules](apps/frontend/AGENTS.md)
- [App tokens](apps/frontend/src/shared/styles/appica-theme.css) and [preview tokens](design-system/themes.css)

## Running

Requires Node.js 20.9+.

```bash
cd apps/frontend
npm install
npm run dev
```

The app runs at http://localhost:3000. Checks in `apps/frontend`: `npm run lint`, `npm run typecheck`, `npm run build`.

## Status

Proof of concept: a full-screen map of Kraków (MapLibre + OpenFreeMap) with a heatmap of events. Search events and places (top left), zoom in to see individual events, hover for a preview and click for a detail panel with crowd, impact, details and nearby events. Events come from the `/api/events` endpoint, which currently returns clearly labelled demo data. No backend and no integration with city services yet.

Themes: **Civic** — light, official (default); **Signal** — dark. The theme switcher was removed from the view; the theme mechanism remains in the code.
