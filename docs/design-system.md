# Design system — Smart City

One neutral theme in light and dark mode, on shared [Appica UI](https://appica.dev/ui) components (React, Base UI, Tailwind CSS v4). The source of truth is [appica-theme.css](../apps/frontend/src/shared/styles/appica-theme.css). The old Civic/Signal HTML preview in `design-system/` is obsolete (D020).

## Brand

The product name is **mRadar**. Its mark uses one open radar sweep, one direction line and one rose incident dot. The radar metaphor means awareness of reported city issues and related clusters, not surveillance or emergency response. The map lockup uses live theme foreground colours with `--heat-mid` for the dot, plus a light drop shadow so the mark stays readable over the map; static brand and install assets use near-black `#171717`, warm white `#FAFAFA` and rose `#B4234A`.

Source assets: `apps/frontend/public/brand/`. Browser and install icons use Next.js metadata files in `apps/frontend/src/app/`.

## Character

Polished and professional: hue-free greys carry the interface, so the map and the report colours do the talking. Small radii (6 px base), thin borders, light shadows (`shadow-xs` on map controls, `shadow-md` at most on floating panels). No blue accent; the primary action is near-black in light mode and near-white in dark mode. Colour appears only where it means something: report categories, status and the heatmap.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| Page | `#FAFAFA` | `#171717` | `background-subtle` / map surround |
| Surface | `#FFFFFF` | `#171717` | Panels, popovers, controls (`background`) |
| Muted fill | `#F4F4F4` | `#232323` | Stat tiles, hover rows |
| Border | `#E4E4E4` | `#2C2C2C` | Dividers; controls use `border-strong` |
| Text | `#3F3F3F` | `#CFCFCF` | Body |
| Strong text | `#111111` | `#FAFAFA` | Headings, values |
| Secondary text | `#6B6B6B` | `#9C9C9C` | Metadata |
| Primary | `#171717` | `#F2F2F2` | Main action, inverted text |
| Error | `#B42318` | `#F97066` | Errors, urgent severity |
| Warning | `#A15C07` | `#F5B83D` | "In progress" status |
| Success | `#067647` | `#47CD89` | "Resolved" status |
| Base map | land `#EEEEEE`, streets `#FFFFFF`, main roads `#FBF6EC`/`#F6EAD2` | land `#141414`, streets `#242424`, main roads `#34302A`/`#463E31` | `--map-*`; app greys with a faint warm accent on main roads; 3D buildings `--map-building-3d` |
| Heatmap | rose wash → `#E11D48` → `#9F1239` | rose wash → `#F43F5E` → `#FDA4AF` core | `--heat-low/mid/high`; one hue, translucent edges |

Typeface: [Geist](https://vercel.com/font) and Geist Mono from the pinned `geist` package via `next/font/local` (bundled variable fonts with Polish diacritics; no Google font download during development or builds).

## Shared foundations

- Typography: Geist for UI text, Geist Mono for identifiers and technical metadata. The font token can be swapped without changing components.
- Body text 16 px / 1.5; secondary 14 px / 1.5; headings 24, 32, 48–64 px. Large sizes only in a short main headline. Paragraphs up to about 65 characters wide.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 px. Content up to 1200 px; 20 px gutter on phones and 32 px on desktop.
- Layout: one column on phones, two from 768 px, wider navigation from 1024 px. Tables may scroll horizontally locally; the page itself should not.
- Touch targets at least 44 × 44 px. Icons from one family, usually 20 px (add `@appica/icons-react` when the first icon is needed). Icon buttons always have an accessible name.
- Visible focus: 2 px outline with the `ring` token, 3 px offset. Status always has text; colour is additional information. Respect `prefers-reduced-motion`.
- Contrast targets: body text at least 4.5:1; essential control boundaries and focus 3:1 against the adjacent background. The `border` token is for decorative dividers; controls use the stronger `border-strong`. Full-screen accessibility needs a manual review after implementation.
- Page overscroll is disabled (`overscroll-behavior: none` on `html` and `body`): the page is a fixed map, so rubber-banding and pull-to-refresh only get in the way.

## Appica UI components

| Component | Usage rule |
| --- | --- |
| Button | One dominant action (`primary`) per section; `outline`/`soft`/`ghost` for the rest. `destructive` only for destructive actions. |
| Card, Separator | Group content; avoid nested cards. |
| Field, Input, Textarea | `FieldLabel`, `FieldDescription` and `FieldError` inside `Field`; a placeholder does not replace a label. |
| Select, Checkbox, Radio, Switch | Value selection matching the semantics; keyboard handled by Base UI. |
| Alert, Badge, Toast | A message and a named status; form errors also next to the field. |
| Dialog / Drawer | Title, description, Escape to close and focus return. |
| Table, Data Table | Column headers; a mobile version or local scroll. |
| Skeleton, Loader | Waiting states; an empty state explains the next step. |

Full catalogue: [llms.txt](https://appica.dev/ui/react/llms.txt). Before writing your own component, check whether the library has one.

## Wiring in the app

App: [apps/frontend](../apps/frontend). As of 2026-10-03, `@appica/ui-react` 1.2, following the [installation](https://appica.dev/ui/docs/react/installation) and [theming](https://appica.dev/ui/docs/react/theming) docs.

1. `src/app/globals.css` imports, in order: `tailwindcss`, `@appica/ui-react/styles.css` (library base tokens), `src/shared/styles/appica-theme.css` (our values). Same selectors and a later source mean our values win.
2. `@source` points to `node_modules/@appica/ui-react/dist` with a relative path; without it component classes are not generated.
3. `ThemeProvider` (`src/app/providers.tsx`) uses Appica's default `light` / `dark` classes on `<html>`, follows the OS (`defaultTheme="system"`) and stores a manual choice in `localStorage` (`smart-city-mode`). The switch lives in the map settings popover (`features/city-map/components/map-settings`).
4. Appica's token model is role-based: `foreground-*`, `background-*`, `border-*` and the accent scales `primary`, `secondary`, `error`, `success`, `warning`, `info` (`subtle`, `soft`, `muted`, base, `strong`, `emphasis`, `intense`, `foreground`). `info` is set to neutral grey so library components do not reintroduce blue.
5. `background` is the card surface; the layout's `body` uses `background-subtle`.
6. `*-foreground` is the text colour on both the base and the `*-muted` fill, e.g. in Badge: in light mode `muted` is a dark solid with white text, in dark mode a light pastel with dark text.
7. Semantic classes: `bg-background`, `text-foreground-intense`, `border-border-strong`, `bg-primary text-primary-foreground`. No hex values in components.

## Map screen patterns

- **Floating chrome over a full-bleed map.** Search (top left) with the filter button beside it; the settings button and "Create a report" bottom right, at the same 12 px inset as the search; attribution bottom left. No toolbars or frames around the map.
- **Detail and form panel:** one non-modal shell (`shared/components/floating-panel`), inset from the right edge on desktop and a bottom sheet on phones. The header stays visible; when the title scrolls away it repeats in the header.
- **Category colour:** eight `--category-*` tokens per theme (power, water, roads, transit, waste, accessibility, greenery, air), all ≥ 4.5:1 as text on their surfaces. Colour is always paired with the category icon and label; unknown API categories get a neutral style.
- **Map settings:** a gear button bottom right (it moves beside an open detail panel, or above the phone sheet) opens a popover with switches for 3D buildings (tilts to 55°, zooms to at least 15.5, where OpenMapTiles building heights extrude) and dark mode.
- **Report places:** at street zoom the heatmap fades out; the building a report is in is drawn in its category colour (as a 3D block at the building's height), or a ~70 m stretch of the road it is on, with the icon marker on top. Reports not in a building or within 30 m of a road keep only the marker.
- **Report markers:** from street zoom, each report is a round marker in its category colour with the category icon (symbol layer; images built from the Appica icons at runtime, `hooks/use-report-icons.ts`). Size grows with weight; markers face the viewer in 3D.
- **Panel sections:** Impact is always visible; Progress, Details and Nearby are collapsible (Appica `Accordion`, same separators and headings as before). Progress opens by default; Nearby shows its count while closed.
- **Panel header:** category label and actions only; status lives in the progress timeline (the hover tooltip keeps a status badge).
- **Report status:** Reported (outline), Confirmed (soft), In progress (warning, pulsing dot), Resolved (success). The panel shows the full progress timeline.
- **I'm affected too:** an outline button under the impact numbers; after use it becomes a quiet "You are counted as affected" note. Hidden on resolved reports.
- **Pin placement:** a fixed centre pin over the moving map, with a bottom card showing the live address, "Use my location", Cancel and Confirm.

## Official workspace patterns (`/operations`)

- **Queue beside the map.** A 24 rem sidebar (full screen on phones) with the "mRadar Operator" lockup, one search for incidents, reports and tickets, and three equal-width line tabs: Needs review, Active, Done, each with its count. Review sorts urgent first, then longest waiting. Rows, separated by inset hairlines: category (or a red "Urgent"), waiting time, title and one line saying what the official has to do. No footer; a "can't refresh" warning with Retry appears only when the data on screen may be stale.
- **Same map, staff layers.** The resident canvas without the heatmap, opening at street level. Linked reports are icon markers with their building or road; private and unreviewed reports are hollow rings. The selected incident's reports get a halo and its 300 m matching radius is a dashed circle; a report under review shows its candidate incidents' circles.
- **Same panel.** The floating panel from the resident map. Header: category, a ⋮ menu for decisions about the incident itself (verify, dispute, close, reopen — each reason in a dialog), show-on-map, close. Under the title: address, then the mono reference, plus a badge only for an official verdict (verified or disputed). A review notice (error for danger, warning for an institution rejection) explains why it waits.
- **One next step.** Below the summary, exactly one of: the proposal card (destination, exact payload in a mono box labelled "Sent exactly as shown", explanation, one primary "Approve and send", outline "Reject" that opens an inline reason), the responsibility picker (radio cards, an "i" hint instead of helper text; only an obvious mapped institution is preselected), or the institution's ticket timeline.
- **Evidence, once.** One open-by-default section lists the resident reports (summary, then reference and time) and then data observations (source, observed, fetched). Only a stale, missing or contradictory observation gets a badge; current data is the norm. The channel (voice or form) is not shown. History is collapsed below it.
- **Icon facts.** Meta lines are short facts led by a 14 px muted icon (`Fact`): clock for time, ruler for distance, people for report counts, server/activity/refresh for source, observed and fetched, ticket for a ticket reference. The icon replaces the word, and the word stays for screen readers.
- **Proposal, no frame.** The pending proposal reads as a sentence ("Create a service ticket for …") with who proposed it and when, then the exact payload box and the reasoning. No outer card and no version number; versions stay in History.
- **Report review.** Candidate incidents sit under "Same problem as": incident title with its status on the right, then distance, how much earlier it started and its report count as small icon facts. "Or" introduces new incident, private and out of scope. A lock with a hint (not a badge) marks private reports and unit details.
- **Demo wording.** The operator UI does not say "demo" in its copy; the map attribution ("Incidents: demo data") is the single label until real data arrives.
- **Settings stay reachable.** On both maps the settings button moves beside an open panel on desktop and above the sheet on phones.
- **Conflicts.** A stale write shows a warning toast and refreshes; typed reasons stay in the form after a failure.

Map layers need literal colours, so the heatmap reads `--heat-low`, `--heat-mid` and `--heat-high` from the active mode at runtime. MapLibre's attribution box is restyled in `globals.css` to match the mode. Charts need labels or patterns; a palette alone does not guarantee readable data. A chart palette has not been added yet — add it with the first chart.
