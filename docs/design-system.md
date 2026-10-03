# Design system — Smart City

Two themes, shared [Appica UI](https://appica.dev/ui) components (React, Base UI, Tailwind CSS v4). The app's source of truth is [appica-theme.css](../apps/frontend/src/shared/styles/appica-theme.css). The dependency-free [preview](../design-system/preview.html) uses [themes.css](../design-system/themes.css) with the same base colours. These are original palettes inspired by references, not the official visual identities of those services.

## Signal — futuristic

Dark surfaces, violet accents, a precise grid, sharp corners and a geometric mark. A large headline paired with small monospace labels. Inspired by the technical composition of [Agent Conf](https://www.agent.sh/): dark background, grid and violet outlines. Decoration belongs in the header, outside reading areas and forms. No background video, shaders or mandatory animation.

| Role | Colour | Use |
| --- | --- | --- |
| Background | `#090A0F` | Main surface |
| Card | `#13151E` | Content and forms |
| Text | `#F3F4FA` | Body text |
| Secondary text | `#A6ADC2` | Descriptions and metadata |
| Primary | `#B79AFF` | Main actions, text `#140B2B` |
| Decorative violet | `#8652FF` | Geometry; not small text |
| Info | `#78DBF0` | Informational messages |
| Success | `#64DDB1` | Confirmations with a label |
| Warning | `#FFD176` | Needs attention |
| Error | `#FF8995` | Errors and destructive actions |

Base radius 2 px. Thin dividers, no card shadow. Strong contrast instead of glass effects; cyan is the info colour, not a second dominant CTA.

## Civic — official

Light background, white surfaces, navy typography and clear, calm actions. Inspired by [gov.pl](https://www.gov.pl/web/gov) and the character of mObywatel named by the user: a readable hierarchy of services and messages. The red identity accent is used sparingly and is independent of the error colour. No national emblem, office marks or claims of official affiliation.

| Role | Colour | Use |
| --- | --- | --- |
| Background | `#F5F7FA` | Main surface |
| Card | `#FFFFFF` | Content and forms |
| Text | `#172B4D` | Body text |
| Secondary text | `#526175` | Descriptions and metadata |
| Primary | `#123D75` | Main actions, white text |
| Identity accent | `#C62842` | Small mark or line |
| Info | `#175EA8` | Informational messages |
| Success | `#176B45` | Confirmations with a label |
| Warning | `#885400` | Needs attention |
| Error | `#B42335` | Errors and destructive actions |

Base radius 10 px, soft shadow and plenty of space. Copy in plain language: a concrete action and its result. Avoid all caps in longer labels and technical messages.

## Shared foundations

- Typography: system sans-serif with Polish diacritics support, monospace for identifiers and technical metadata. No external fonts required. The font token can be swapped later without changing components.
- Body text 16 px / 1.5; secondary 14 px / 1.5; headings 24, 32, 48–64 px. Large sizes only in a short main headline. Paragraphs up to about 65 characters wide.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 px. Content up to 1200 px; 20 px gutter on phones and 32 px on desktop.
- Layout: one column on phones, two from 768 px, wider navigation from 1024 px. Tables may scroll horizontally locally; the page itself should not.
- Touch targets at least 44 × 44 px. Icons from one family, usually 20 px (add `@appica/icons-react` when the first icon is needed). Icon buttons always have an accessible name.
- Visible focus: 2 px outline with the `ring` token, 3 px offset. Status always has text; colour is additional information. Respect `prefers-reduced-motion`.
- Contrast targets: body text at least 4.5:1; essential control boundaries and focus 3:1 against the adjacent background. The `border` token is for decorative dividers; controls use the stronger `border-strong`. Full-screen accessibility needs a manual review after implementation.

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
3. `ThemeProvider` (`src/app/providers.tsx`) has the themes `civic` and `signal`, mapped to the `light` and `dark` classes on `<html>`. Civic is the default and `enableSystem` is off, so the OS dark mode does not change the theme. The choice is stored in `localStorage` (`smart-city-theme`); the provider's script sets the class before first paint.
4. Appica's token model is role-based: `foreground-*`, `background-*`, `border-*` and the accent scales `primary`, `secondary`, `error`, `success`, `warning`, `info` (`subtle`, `soft`, `muted`, base, `strong`, `emphasis`, `intense`, `foreground`). The `dark:` variant means Signal.
5. `background` is the card surface. The Civic page uses `background-subtle` (#F5F7FA), the Signal page `background` (#090A0F); the layout's `body` sets this.
6. `*-foreground` is the text colour on both the base and the `*-muted` fill, e.g. in Badge. That is why in Civic `muted` is a dark solid shade with white text and in Signal a light pastel with dark text. Pairs were checked with the WCAG formula: all ≥ 5:1, field border ≥ 3:1.
7. Semantic classes: `bg-background`, `text-foreground-intense`, `border-border-strong`, `bg-primary text-primary-foreground`, `bg-brand-accent`. No hex values in components.

Map layers need literal colours, so the heatmap reads `--info`, `--warning` and `--error` from the active theme at runtime. Charts need labels or patterns; a palette alone does not guarantee readable data. A chart palette has not been added yet — add it with the first chart.
