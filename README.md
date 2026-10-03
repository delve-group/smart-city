# Smart City

Fundament projektu hackathonowego: baza wiedzy, zasady pracy i design system i szkielet aplikacji Next.js z komponentami [Appica UI](https://appica.dev/ui).

- [Zasady agentów](AGENTS.md)
- [Baza wiedzy](docs/knowledge-base/README.md)
- [Architektura systemu](docs/architecture.md)
- [Design system i oba motywy](docs/design-system.md)
- [Podgląd motywów](design-system/preview.html) — otwórz plik w przeglądarce; działa bez instalacji.
- [Frontend](apps/frontend) i jego [zasady dla agentów](apps/frontend/AGENTS.md)
- [Tokeny aplikacji](apps/frontend/src/shared/styles/appica-theme.css) i [tokeny wzornika](design-system/themes.css)

## Uruchomienie

Wymagany Node.js 22.12+.

```bash
cd apps/frontend
npm install
npm run dev
```

Aplikacja działa pod http://localhost:3000. Kontrole w `apps/frontend`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Stan

Prototyp: pełnoekranowa mapa Krakowa (MapLibre + OpenFreeMap) z mapą cieplną zdarzeń. Zdarzenia pochodzą z endpointu `/api/events`, który na razie zwraca jawnie oznaczone dane demonstracyjne. Brak backendu i integracji z usługami miejskimi.

Motywy: **Civic** — jasny, urzędowy (domyślny); **Signal** — ciemny. Przełącznik motywu został usunięty z widoku; mechanizm motywów pozostaje w kodzie.
