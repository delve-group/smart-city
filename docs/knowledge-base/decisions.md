# Rejestr decyzji

| ID / data | Decyzja i status | Powód / konsekwencja |
| --- | --- | --- |
| D001 / 2026-10-03 | Przyjęta: moduły według funkcji, jeden projekt | Szybki rozwój i czytelne granice bez kosztu mikroserwisów. |
| D002 / 2026-10-03 | Przyjęta: shadcn/ui, wspólne komponenty i tokeny dwóch motywów | Spójne zachowanie; wygląd zmieniamy bez duplikacji logiki. |
| D003 / 2026-10-03 | Przyjęta: weryfikacja według AGENTS.md | Ochrona ważnej logiki przy ograniczonym budżecie hackathonu. |
| D004 / 2026-10-03 | Robocza: Civic domyślny, Signal opcjonalny | Usługi miejskie powinny mieć spokojny, czytelny punkt wejścia. Wybór odwracalny. |
| D005 / 2026-10-03 | Propozycja: React, TypeScript, Vite, Tailwind CSS | Prosty frontend; backend wybieramy po poznaniu scenariusza i źródeł danych. |
| D006 / 2026-10-03 | Przyjęta: wzornik bez zależności na etapie inicjalizacji | Można ocenić palety i hierarchię przed uruchomieniem aplikacji. HTML nie zastępuje komponentów shadcn/ui. |
| D007 / 2026-10-03 | Przyjęta: przepływ Git i integracja według sekcji „Git, PR i integracja zmian” w [AGENTS.md](../../AGENTS.md) | Zmiany mają być przeglądalne i zgodne z aktualnym kodem docelowym przed scaleniem. |
| D008 / 2026-10-03 | Robocza: pierwszy widok mapy użyje podkładu WMTS oraz OpenLayers; budynki będą dołączane z WFS według widocznego obszaru | Publiczne usługi GUGiK i MSIP pokrywają podgląd miasta oraz geometrię obiektów. Zapytania `bbox` ograniczą transfer i liczbę renderowanych elementów; szczegóły zależą od sprawdzenia capabilities, CORS i limitów. |
