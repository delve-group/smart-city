# Kontekst projektu

Aktualizacja: 2026-10-03.

## Potwierdzone

- Projekt: Smart City; realizacja w warunkach hackathonu.
- Szybkość dostarczania ma bardzo duże znaczenie. Kod ma pozostać modularny i łatwy do utrzymania oraz skalowania.
- Baza UI: shadcn/ui. Dwa motywy: futurystyczny inspirowany agent.sh i stonowany, urzędowy inspirowany mObywatelem/gov.pl.
- Zasady testowania definiuje wyłącznie [AGENTS.md](../../AGENTS.md).

## Robocze założenia

- Aplikacja webowa, polski interfejs, użyteczna na telefonie i komputerze.
- Civic jako domyślny motyw; wybór można zmienić jednym atrybutem. Signal pozostaje równorzędną alternatywą.
- React + TypeScript + Vite + Tailwind CSS jako lekki punkt startowy frontendu. To propozycja architektury, nie zainstalowany stos.
- Zgłoszenia miejskie we wzorniku to wyłącznie przykład prezentacji. Nie stanowią zatwierdzonego zakresu produktu.

## Do ustalenia przy pierwszej funkcji

- Główny użytkownik i jeden najważniejszy scenariusz demonstracyjny.
- Źródła danych, dostępne API, model uprawnień i potrzeba logowania.
- Czy demonstracja wymaga trwałego zapisu, backendu, mapy lub aktualizacji na żywo.
- Warunki wdrożenia i konkretne ograniczenia czasowe zespołu.

## Stan wykonania

Gotowe: instrukcje agentów, baza wiedzy, projekt architektury, specyfikacja design systemu, dwa zestawy tokenów i lokalny wzornik. Brak kodu biznesowego, instalacji shadcn/ui i integracji z usługami miejskimi.
