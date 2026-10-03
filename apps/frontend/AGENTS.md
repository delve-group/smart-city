# Frontend — zasady dla agentów

Obowiązują też [zasady z katalogu głównego](../../AGENTS.md). Polecenia uruchamiaj w tym katalogu: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`.

## Appica UI

Indeks komponentów (pobierz stronę `.md` przed użyciem nowego komponentu): https://appica.dev/ui/react/llms.txt. Wersja reguł zgodna z zainstalowanym pakietem: `node_modules/@appica/ui-react/agent-rules.md`.

- Tylko Tailwind CSS v4. Nie twórz `tailwind.config.js` — konfiguracja żyje w CSS (`@theme`).
- `@source` w `src/app/globals.css` musi wskazywać `node_modules/@appica/ui-react/dist` ścieżką względną do tego pliku; bez tego komponenty renderują się bez stylów.
- React 19: bez `forwardRef`, `ref` to zwykły prop.
- Importuj z podścieżki, jeden komponent na import: `import { Button } from '@appica/ui-react/button'`.
- Bez hexów, pikseli promieni i literałów czasu w komponentach. Używaj tokenów ról: `bg-background-muted`, `text-foreground-intense`, `border-border-strong`, `var(--radius-md)`. Lista: https://appica.dev/ui/docs/react/colors.md
- Bez utility opartych o odcień (`bg-gray-100`, `text-slate-600`).
- Preferuj warianty v4 (`*:`, `**:`, `data-*:`, `not-*:`) zamiast `[&_...]`.
- Link wyglądający jak przycisk: `buttonVariants(...)` na `<a>`, nigdy `<Button render={<a/>}>`.
- Nadpisania `className` umieszczaj na komponencie, nie na JSX przekazanym do `render`.
- Nie pisz własnej wersji komponentu, który istnieje w bibliotece.
- Motywy: Civic = klasa `light`, Signal = klasa `dark` na `<html>`, ustawiane przez `ThemeProvider` w `src/app/providers.tsx`. Wartości tokenów zmieniaj tylko w `src/styles/appica-theme.css`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
