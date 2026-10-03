# Rejestr decyzji

| ID / data | Decyzja i status | Powód / konsekwencja |
| --- | --- | --- |
| D001 / 2026-10-03 | Przyjęta: moduły według funkcji, jeden projekt | Szybki rozwój i czytelne granice bez kosztu mikroserwisów. |
| D002 / 2026-10-03 | Zastąpiona przez D010: shadcn/ui, wspólne komponenty i tokeny dwóch motywów | Spójne zachowanie; wygląd zmieniamy bez duplikacji logiki. |
| D003 / 2026-10-03 | Przyjęta: weryfikacja według AGENTS.md | Ochrona ważnej logiki przy ograniczonym budżecie hackathonu. |
| D004 / 2026-10-03 | Robocza: Civic domyślny, Signal opcjonalny | Usługi miejskie powinny mieć spokojny, czytelny punkt wejścia. Wybór odwracalny. |
| D005 / 2026-10-03 | Zastąpiona przez D011: React, TypeScript, Vite, Tailwind CSS | Prosty frontend; backend wybieramy po poznaniu scenariusza i źródeł danych. |
| D006 / 2026-10-03 | Przyjęta: wzornik bez zależności na etapie inicjalizacji | Można ocenić palety i hierarchię przed uruchomieniem aplikacji. HTML nie zastępuje komponentów shadcn/ui. |
| D007 / 2026-10-03 | Przyjęta: przepływ Git i integracja według sekcji „Git, PR i integracja zmian” w [AGENTS.md](../../AGENTS.md) | Zmiany mają być przeglądalne i zgodne z aktualnym kodem docelowym przed scaleniem. |
| D008 / 2026-10-03 | Robocza: pierwszy widok mapy użyje podkładu WMTS oraz OpenLayers; budynki będą dołączane z WFS według widocznego obszaru | Publiczne usługi GUGiK i MSIP pokrywają podgląd miasta oraz geometrię obiektów. Zapytania `bbox` ograniczą transfer i liczbę renderowanych elementów; szczegóły zależą od sprawdzenia capabilities, CORS i limitów. |
| D009 / 2026-10-03 | Przyjęta: oficjalne etapy i kryteria oceny konkursu zapisujemy w osobnej notatce bazy wiedzy | Ułatwia planowanie rozwiązania pod opublikowaną punktację i próg kwalifikacyjny; źródło oraz ograniczenia interpretacji są wskazane w [notatce o ocenie](hackathon-evaluation.md). |
| D010 / 2026-10-03 | Przyjęta: Appica UI (`@appica/ui-react`) zamiast shadcn/ui; Civic i Signal jako nadpisania tokenów Appica (`light`/`dark`) w `design-system/appica-theme.css` | Wybór użytkownika. Gotowy pakiet ponad 70 dostępnych komponentów (Base UI, Tailwind v4) bez kopiowania kodu do repozytorium. Konsekwencja: aktualizacje przychodzą z wersją pakietu; `themes.css` obsługuje już tylko wzornik HTML. |
| D011 / 2026-10-03 | Przyjęta: Next.js 16 (App Router, Turbopack, React Compiler), npm | Prośba użytkownika o projekt Next.js; App Router z Server Components to zalecana ścieżka i miejsce na przyszłe endpointy API bez osobnego backendu. |
