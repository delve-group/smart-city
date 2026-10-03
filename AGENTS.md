# Zasady pracy agentów

## Cel

Budujemy Smart City na hackathon. Dostarczaj działające, małe fragmenty produktu szybko, z kodem łatwym do zrozumienia, utrzymania i późniejszego rozwijania.

## Kod i architektura

- Organizuj kod według funkcji biznesowych. Oddziel UI, reguły domenowe i dostęp do danych; twórz warstwy dopiero, kiedy są potrzebne.
- Utrzymuj wąskie odpowiedzialności modułów i jawne zależności. Logika biznesowa powinna działać bez Reacta, DOM i sieci.
- Wybieraj najprostsze rozwiązanie spełniające bieżące wymagania. Nowa abstrakcja musi rozwiązywać istniejący problem; mała duplikacja jest lepsza od przedwczesnego frameworka.
- Preferuj czytelne nazwy, jawne typy na granicach i kompozycję. Waliduj dane z zewnętrznych źródeł i obsługuj błędy tam, gdzie można na nie zareagować.
- Używaj Appica UI (`@appica/ui-react`) jako bazy komponentów; zasady w [apps/frontend/AGENTS.md](apps/frontend/AGENTS.md). Kolory i kształty pochodzą z tokenów motywu; nie duplikuj komponentów dla Signal i Civic.
- Ogranicz zależności i zakres zmiany. Mikroserwisy, własne frameworki i optymalizacje bez konkretnego problemu odkładamy.
- Sekrety trzymaj poza repozytorium. Dane demonstracyjne oznaczaj jednoznacznie; nie przedstawiaj mocków jako integracji produkcyjnych.

## Testy i weryfikacja

- Pisz **wyłącznie testy jednostkowe najważniejszej logiki**: reguł biznesowych, obliczeń, walidacji i istotnych transformacji danych. Uwzględniaj przypadki brzegowe i błędy.
- **Nie pisz testów położenia przycisku, zmiany koloru, klas CSS, pikseli, snapshotów UI ani innych szczegółów prezentacji. Nie dodawaj testów integracyjnych ani E2E.**
- Nie twórz testów trywialnych getterów, kodu bibliotek ani testów powtarzających implementację. Nie ustawiaj sztucznego progu pokrycia.
- Wygląd, responsywność, klawiaturę i stany błędów sprawdzaj krótkim ręcznym przeglądem. Uruchamiaj dostępny lint, kontrolę typów, build oraz jednostki związane ze zmianą.
- Raportuj, co rzeczywiście sprawdzono, a czego nie udało się zweryfikować.

## Git, PR i integracja zmian

- **Nie wolno wykonywać bezpośredniego push ani force push do `main`. Wszystkie zmiany trafiają do `main` wyłącznie przez Pull Request.** Nie omijaj tego procesu lokalnym scaleniem i późniejszym pushem do `main`.
- Pracuj i commituj na osobnej gałęzi `codex/<opis-zmiany>`. Pushuj gałąź roboczą i otwórz PR do właściwej gałęzi docelowej.
- Przed zgłoszeniem PR do scalenia pobierz aktualny stan zdalnej gałęzi docelowej i zintegruj go ze swoją gałęzią przez merge lub rebase. Rozwiąż konflikty z zachowaniem intencji obu zmian; nie nadpisuj cudzej pracy dla samego usunięcia konfliktu.
- Sprawdź wspólne działanie dołączanego kodu i aktualnego kodu docelowego: kontrakty, wywołania, typy, zależności i przepływy danych objęte zmianą. Sam brak konfliktów Git nie oznacza poprawnej integracji.
- Po integracji uruchom dostępne kontrole odpowiednie do zmiany, zgodnie z sekcją „Testy i weryfikacja”. Opisz w PR wynik, wykonane sprawdzenia i ograniczenia. Jeśli gałąź docelowa zmieni się przed scaleniem, ponów integrację i sprawdzenia objętych nią obszarów.
- Scalaj przez mechanizm PR po spełnieniu wymaganych kontroli i reguł repozytorium. Gdy brak zdalnego repozytorium lub dostępu uniemożliwia PR, zachowaj zmiany na gałęzi roboczej i zgłoś przeszkodę; nie zastępuj PR pushem do `main`.

## Baza wiedzy i realizacja

1. Przy rozpoczęciu pracy przeczytaj [indeks wiedzy](docs/knowledge-base/README.md) i [kontekst projektu](docs/knowledge-base/project.md).
2. Przed zmianą granic modułów, przepływu danych lub integracji przeczytaj [architekturę](docs/architecture.md). Przed pracą nad UI przeczytaj [design system](docs/design-system.md) i użyj [tokenów](apps/frontend/src/shared/styles/appica-theme.css).
3. Zrealizuj najmniejszy kompletny zakres. Pytaj tylko o brakujące informacje wpływające istotnie na produkt; odwracalne decyzje podejmuj samodzielnie i oznaczaj założenia.
4. Po istotnej decyzji lub odkryciu aktualizuj właściwy dokument, a decyzję z uzasadnieniem dopisz do [rejestru decyzji](docs/knowledge-base/decisions.md). Zachowuj jedno źródło prawdy.
5. Zakończ krótkim opisem wyniku, weryfikacji i rzeczywistych ograniczeń. Nie deklaruj wdrożenia, integracji ani testów, których nie wykonano.

Dokumentację i komunikację prowadź po polsku; identyfikatory w kodzie po angielsku. Nazwa `AGENTS.md` jest celowa — to plik instrukcji dla narzędzi agentowych.
