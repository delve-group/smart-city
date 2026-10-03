# Frontend — zasady dla agentów

Obowiązują też [zasady z katalogu głównego](../../AGENTS.md). Polecenia uruchamiaj w tym katalogu: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Struktura kodu

```text
src/
  app/                          # tylko routing Next.js: layout, strony, route handlers, providers
    api/<zasób>/route.ts        # endpointy Next; pliki pomocnicze (np. mocki) obok route.ts
  api/                          # klient usług zewnętrznych i własnego API
    <usługa>/
      get-<zasób>.ts            # jeden endpoint = jeden plik
      types.ts                  # DTO, schematy walidacji i typy modelu aplikacji
      mappers.ts                # DTO → model aplikacji (+ mappers.test.ts)
  features/
    <funkcja>/
      components/
        <komponent>/<komponent>.tsx   # jeden komponent = jeden plik, każdy we własnym folderze
      hooks/                    # hooki używane tylko przez tę funkcję
      utils/                    # funkcje pomocnicze tylko tej funkcji (+ testy obok)
  shared/                       # kod używany przez więcej niż jedną funkcję
    components/<komponent>/     # współdzielone komponenty
    hooks/, utils/, theme/, styles/
```

- Dziel kod według funkcji biznesowych, nie według typu pliku. Nie wrzucaj wszystkiego do jednego folderu.
- Komponenty mają być małe: jeden komponent na plik. Gdy plik rośnie, wydziel podkomponent do osobnego folderu w tej samej funkcji.
- Kolejność wyboru komponentu: 1) komponent z Appica UI, 2) istniejący komponent z `shared/components`, 3) dopiero wtedy nowy komponent. Nowy komponent, który może przydać się w innej funkcji, umieszczaj od razu w `shared/components`.
- Nie twórz globalnego folderu `utils/`. Kod używany przez kilka funkcji trafia do `shared/`, a kod jednej funkcji do `features/<funkcja>/utils/`.
- Funkcja nie importuje prywatnych plików innej funkcji. Wspólne elementy przenieś do `shared/`.
- Komponenty i hooki nie wołają `fetch` bezpośrednio; korzystają z funkcji w `src/api/`.
- Testy jednostkowe leżą obok testowanego pliku (`*.test.ts`) i obejmują tylko logikę (mappery, walidację, obliczenia).
- W pozostałych sprawach stosuj aktualne zalecenia Next.js (App Router, Server Components domyślnie, `"use client"` tylko tam, gdzie potrzebna interaktywność lub API przeglądarki).

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
- Motywy: Civic = klasa `light`, Signal = klasa `dark` na `<html>`, ustawiane przez `ThemeProvider` w `src/app/providers.tsx`. Wartości tokenów zmieniaj tylko w `src/shared/styles/appica-theme.css`.

## Mapa

- Mapa: MapLibre GL (`react-map-gl/maplibre`) z darmowymi kafelkami OpenFreeMap, bez klucza API. Bibliotekę mapy importuje tylko `features/event-heatmap/components/heatmap-map/heatmap-map.tsx`; zamiana na Google Maps polega na nowej implementacji tego komponentu z tymi samymi propsami.
- MapLibre 6 ładuje worker jako osobny moduł. `scripts/copy-maplibre-worker.mjs` kopiuje go do `public/maplibre/` przed `dev` i `build`; nie commituj tych plików.
- Warstwy heatmap montuj warunkowo zamiast ukrywać je przez `visibility: "none"` — ukryta przy dodaniu warstwa heatmap nie rysuje się po pokazaniu.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
