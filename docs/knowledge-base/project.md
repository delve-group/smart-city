# Kontekst projektu

Aktualizacja: 2026-10-03.

## Potwierdzone

- Projekt: Smart City; realizacja w warunkach hackathonu.
- Szybkość dostarczania ma bardzo duże znaczenie. Kod ma pozostać modularny i łatwy do utrzymania oraz skalowania.
- Baza UI: shadcn/ui. Dwa motywy: futurystyczny inspirowany agent.sh i stonowany, urzędowy inspirowany mObywatelem/gov.pl.
- Zasady testowania definiuje wyłącznie [AGENTS.md](../../AGENTS.md).
- Dla Krakowa są publicznie opublikowane urzędowe usługi mapowe MSIP i GUGiK. Rozpoznane źródła oraz kontrole przed integracją opisuje [notatka o danych przestrzennych](geospatial-data.md).

## Robocze założenia

- Aplikacja webowa, polski interfejs, użyteczna na telefonie i komputerze.
- Civic jako domyślny motyw; wybór można zmienić jednym atrybutem. Signal pozostaje równorzędną alternatywą.
- React + TypeScript + Vite + Tailwind CSS jako lekki punkt startowy frontendu. To propozycja architektury, nie zainstalowany stos.
- Zgłoszenia miejskie we wzorniku to wyłącznie przykład prezentacji. Nie stanowią zatwierdzonego zakresu produktu.

## Do ustalenia przy pierwszej funkcji

- Główny użytkownik i jeden najważniejszy scenariusz demonstracyjny.
- Dokładne warstwy i atrybuty WFS potrzebne w scenariuszu demonstracyjnym oraz ograniczenia CORS i limity usług.
- Czy demonstracja wymaga trwałego zapisu, backendu, mapy lub aktualizacji na żywo.
- Warunki wdrożenia i konkretne ograniczenia czasowe zespołu.

## Stan wykonania

Gotowe: instrukcje agentów, baza wiedzy, projekt architektury, specyfikacja design systemu, dwa zestawy tokenów i lokalny wzornik. Brak kodu biznesowego, instalacji shadcn/ui i integracji z usługami miejskimi.
