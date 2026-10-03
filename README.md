# Smart City

Fundament projektu hackathonowego: baza wiedzy, zasady pracy i design system i szkielet aplikacji Next.js z komponentami [Appica UI](https://appica.dev/ui).

- [Zasady agentów](AGENTS.md)
- [Baza wiedzy](docs/knowledge-base/README.md)
- [Architektura systemu](docs/architecture.md)
- [Design system i oba motywy](docs/design-system.md)
- [Podgląd motywów](design-system/preview.html) — otwórz plik w przeglądarce; działa bez instalacji.
- [Tokeny aplikacji](design-system/appica-theme.css) i [tokeny wzornika](design-system/themes.css)

## Uruchomienie

Wymagany Node.js 20.9+.

```bash
npm install
npm run dev
```

Aplikacja działa pod http://localhost:3000. Kontrole: `npm run lint`, `npm run typecheck`, `npm run build`.

## Stan

Szkielet Next.js (App Router, React 19, TypeScript, Tailwind CSS v4) z Appica UI i ekranem demonstracyjnym komponentów. Brak funkcji biznesowych, backendu i integracji z usługami miejskimi.

Motywy: **Civic** — jasny, urzędowy (domyślny); **Signal** — ciemny, futurystyczny i geometryczny. Przełącznik jest w nagłówku aplikacji. Zakres produktu pozostaje do ustalenia przy pierwszej funkcji.
