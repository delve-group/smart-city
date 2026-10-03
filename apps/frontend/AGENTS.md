# Frontend — agent rules

The [root rules](../../AGENTS.md) apply too. Start the local stack using the root [README](../../README.md#running). Run app checks in this directory: `npm run lint`, `npm run typecheck`, `npm run build`.

## Code structure

```text
src/
  app/                          # Next.js routing only: layouts, pages, route handlers, providers
    api/<resource>/route.ts     # Next endpoints; helper files (e.g. mocks) next to route.ts
  api/                          # clients for external services and our own API
    <service>/
      get-<resource>.ts         # one endpoint = one file
      types.ts                  # DTOs, validation schemas and app model types
      mappers.ts                # DTO → app model
  features/
    <feature>/
      components/
        <component>/<component>.tsx   # one component = one file, each in its own folder
      hooks/                    # hooks used only by this feature
      utils/                    # helpers used only by this feature
  shared/                       # code used by more than one feature
    components/<component>/     # shared components
    hooks/, utils/, theme/, styles/
  server/                       # server-only feature services, auth and data access
```

- Split code by business feature, not by file type. Do not dump everything into one folder.
- Keep components small: one component per file. When a file grows, extract a subcomponent into its own folder in the same feature.
- Order of preference for UI: 1) an Appica UI component, 2) an existing component from `shared/components`, 3) only then a new component. A new component that another feature could use goes straight into `shared/components`.
- No global `utils/` folder. Code used by several features goes to `shared/`; code used by one feature goes to `features/<feature>/utils/`.
- A feature does not import another feature's private files. A screen-level view may compose other features through their top-level components and hooks (e.g. `city-map-view` uses `category-filter` and `report-issue`). Move shared pieces to `shared/`.
- Components and hooks never call `fetch` directly; they use functions from `src/api/`.
- For everything else follow current Next.js recommendations (App Router, Server Components by default, `"use client"` only where interactivity or browser APIs are needed).

## Appica UI

Component index (fetch a component's `.md` page before using it for the first time): https://appica.dev/ui/react/llms.txt. Rules matching the installed version: `node_modules/@appica/ui-react/agent-rules.md`.

- Tailwind CSS v4 only. Do not create `tailwind.config.js` — configuration lives in CSS (`@theme`).
- `@source` in `src/app/globals.css` must point to `node_modules/@appica/ui-react/dist` with a path relative to that file; without it components render unstyled.
- React 19: no `forwardRef`, `ref` is a plain prop.
- Import from the subpath, one component per import: `import { Button } from '@appica/ui-react/button'`.
- No hex colours, pixel radii or duration literals in components. Use role tokens: `bg-background-muted`, `text-foreground-intense`, `border-border-strong`, `var(--radius-md)`. Full list: https://appica.dev/ui/docs/react/colors.md
- No hue-based utilities (`bg-gray-100`, `text-slate-600`).
- Prefer v4 variants (`*:`, `**:`, `data-*:`, `not-*:`) over `[&_...]` selectors.
- For a link styled as a button, use `buttonVariants(...)` on the `<a>`, never `<Button render={<a/>}>`.
- Put `className` overrides on the component, not on the JSX passed to `render`.
- Never hand-roll a component that exists in the library.
- One neutral theme with light and dark mode: the `light` / `dark` class on `<html>`, set by `ThemeProvider` in `src/app/providers.tsx` (follows the OS until the user toggles). Change token values only in `src/shared/styles/appica-theme.css`.
- Keep chrome quiet: small radii from the tokens, `shadow-xs`–`shadow-md` at most, no blue accents. Colour is for meaning only (categories, status, heatmap).

## Map

- Map: MapLibre GL (`react-map-gl/maplibre`) with free OpenFreeMap tiles, no API key. Only the `features/city-map/components/city-map-canvas/` folder (the canvas and its colocated hooks) imports the map library; switching to Google Maps means a new implementation of that component with the same props.
- The canvas draws generic `MapPoint`s and `MapArea`s (`city-map-canvas/map-types.ts`); each screen maps its own records to them. `muted` points (private or unreviewed reports) are hollow rings and never claim a building or road. Screens that are not the resident map (e.g. `incident-operations`) may use the canvas and `map-settings` as top-level city-map components.
- MapLibre 6 loads its worker as a separate module. `scripts/copy-maplibre-worker.mjs` copies it to `public/maplibre/` before `dev` and `build`; do not commit those files.
- Mount heatmap layers conditionally instead of hiding them with `visibility: "none"` — a heatmap layer added while hidden does not draw once shown.
- Use `offset`, not `padding`, in `flyTo`: MapLibre keeps padding for all later camera moves and tile loading, which leaves an empty strip after the panel closes.
- Map layers need literal colours: read them from theme tokens at runtime (`utils/read-map-colors.ts`), never hard-code hex values. The base map (land, parks, buildings, water, roads) is recoloured by `utils/style-base-map.ts` (OpenMapTiles layer ids) with the `--map-*` tokens and adds a `building-3d` fill-extrusion layer under the labels; the style JSON is fetched and patched in `hooks/use-map-style.ts`.
- Report places: `city-map-canvas/use-report-places.ts` matches each report in view (street zoom) to the building it is in or the road within 30 m, from rendered tile features. Tiles merge neighbouring buildings into one feature with one id, so never colour buildings by id or feature state — copy the single footprint (`utils/building-footprint.ts`) into the report-buildings source instead.
- Place search and reverse geocoding use the public Photon instance (fair use, no key). Replace it with a self-hosted or commercial geocoder before real traffic.
- Categories are API data. Style known ids in `shared/utils/category-appearance.ts` and the `--category-*` tokens; unknown ids fall back to a neutral style, never break.
- Official workspace (`/operations`, `features/incident-operations`): one feature behind `operations-gate` (official session; shared `staff-sign-in`). Data comes from PostgreSQL through `app/api/operations/` and `server/incidents`, `server/actions`. Every command sends the version the official saw; a `409` refreshes the view instead of retrying. Approve sends exactly the shown payload; a ticket appears only after the executor confirmed it, and an unknown outcome is reconciled, never resent.
- The category/report routes remain an in-memory demo; validate report input with `src/api/reports/types.ts`. Persistent auth/health routes are thin adapters to `src/server/`. Before adding persistent API operations, read [the API contract](../../docs/api-contract.md); reuse its session, origin, permission and response boundaries. Add database changes as new numbered SQL migrations in `db/migrations/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
