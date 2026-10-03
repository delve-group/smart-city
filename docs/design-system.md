# Design system — Smart City

Dwa motywy, wspólne komponenty [Appica UI](https://appica.dev/ui) (React, Base UI, Tailwind CSS v4). Źródłem wartości dla aplikacji jest [appica-theme.css](../apps/frontend/src/shared/styles/appica-theme.css). [Wzornik](../design-system/preview.html) bez zależności korzysta z [themes.css](../design-system/themes.css) z tymi samymi kolorami bazowymi. To autorskie palety inspirowane referencjami, nie oficjalne identyfikacje wizualne tych serwisów.

## Signal — futurystyczny

Ciemne powierzchnie, fioletowe akcenty, precyzyjna siatka, ostre narożniki i geometryczny znak. Duży nagłówek zestawiony z małymi etykietami monospace. Inspiracją jest techniczna kompozycja [Agent Conf](https://www.agent.sh/): ciemne tło, siatka i fioletowe obramowania. Dekoracje stosujemy w nagłówku, poza obszarem czytania i formularzami. Bez wideo w tle, shaderów i obowiązkowych animacji.

| Rola | Kolor | Zastosowanie |
| --- | --- | --- |
| Tło | `#090A0F` | Główna powierzchnia |
| Karta | `#13151E` | Treść i formularze |
| Tekst | `#F3F4FA` | Podstawowy tekst |
| Tekst pomocniczy | `#A6ADC2` | Opisy i metadane |
| Primary | `#B79AFF` | Główne akcje, tekst `#140B2B` |
| Fiolet dekoracyjny | `#8652FF` | Geometria; nie drobny tekst |
| Informacja | `#78DBF0` | Komunikaty informacyjne |
| Sukces | `#64DDB1` | Potwierdzenia z etykietą |
| Ostrzeżenie | `#FFD176` | Wymagana uwaga |
| Błąd | `#FF8995` | Błędy i akcje destrukcyjne |

Promień bazowy 2 px. Cienkie podziały, brak cienia kart. Mocny kontrast zamiast efektu szkła; cyjan jest kolorem informacyjnym, nie drugim dominującym CTA.

## Civic — urzędowy

Jasne tło, białe powierzchnie, granatowa typografia i wyraźne, spokojne akcje. Inspiracja [gov.pl](https://www.gov.pl/web/gov) i wskazanym przez użytkownika charakterem mObywatela: czytelna hierarchia usług i komunikatów. Czerwony akcent identyfikacyjny jest oszczędny, niezależny od koloru błędu. Bez godła, znaków urzędu i deklaracji oficjalnej afiliacji.

| Rola | Kolor | Zastosowanie |
| --- | --- | --- |
| Tło | `#F5F7FA` | Główna powierzchnia |
| Karta | `#FFFFFF` | Treść i formularze |
| Tekst | `#172B4D` | Podstawowy tekst |
| Tekst pomocniczy | `#526175` | Opisy i metadane |
| Primary | `#123D75` | Główne akcje, tekst biały |
| Akcent identyfikacyjny | `#C62842` | Mały znak lub linia |
| Informacja | `#175EA8` | Komunikaty informacyjne |
| Sukces | `#176B45` | Potwierdzenia z etykietą |
| Ostrzeżenie | `#885400` | Wymagana uwaga |
| Błąd | `#B42335` | Błędy i akcje destrukcyjne |

Promień bazowy 10 px, łagodny cień i dużo przestrzeni. Opisy prostym polskim: konkretna czynność i jej wynik. Unikaj wielkich liter w dłuższych etykietach i technicznych komunikatów.

## Wspólne podstawy

- Typografia startowa: systemowy sans-serif z polskimi znakami, monospace do identyfikatorów i technicznych metadanych. Brak zewnętrznych fontów wymaganych do działania. W przyszłości można podmienić token fontu bez zmiany komponentów.
- Tekst bazowy 16 px / 1.5; pomocniczy 14 px / 1.5; nagłówki 24, 32, 48–64 px. Duża skala tylko w krótkim nagłówku głównym. Akapity do około 65 znaków szerokości.
- Skala odstępów: 4, 8, 12, 16, 24, 32, 48, 64 px. Treść do 1200 px; margines 20 px na telefonie i 32 px na desktopie.
- Układ: jeden słupek na telefonie, dwa od 768 px, szersza nawigacja od 1024 px. Tabele mogą mieć lokalny poziomy scroll; cała strona nie powinna go wymagać.
- Akcje dotykowe co najmniej 44 × 44 px. Ikony jednej rodziny (Appica Icons, `@appica/icons-react`), zwykle 20 px. Przycisk ikonowy zawsze ma dostępną nazwę.
- Focus widoczny: obrys 2 px tokenem `ring`, odstęp 3 px. Status zawsze ma tekst; kolor jest dodatkową informacją. Respektuj `prefers-reduced-motion`.
- Cel kontrastu: zwykły tekst minimum 4.5:1; istotne granice kontrolek i focus 3:1 względem przylegającego tła. Token `border` służy podziałom dekoracyjnym; kontrolki używają mocniejszego `input`. Dostępność całego ekranu wymaga ręcznej oceny po wdrożeniu.

## Komponenty Appica UI

| Komponent | Reguła użycia |
| --- | --- |
| Button | Jedna dominująca akcja (`primary`) na sekcję; `outline`/`soft`/`ghost` dla pozostałych. `destructive` tylko dla działania destrukcyjnego. |
| Card, Separator | Grupowanie treści; unikaj wielopiętrowych kart. |
| Field, Input, Textarea | `FieldLabel`, `FieldDescription` i `FieldError` w `Field`; placeholder nie zastępuje etykiety. |
| Select, Checkbox, Radio, Switch | Wybór wartości zgodny z semantyką; klawiatura obsługiwana przez Base UI. |
| Alert, Badge, Toast | Komunikat i nazwany status; błąd formularza również przy polu. |
| Dialog / Drawer | Tytuł, opis, zamykanie Escape i powrót focusu. |
| Table, Data Table | Nagłówki kolumn; wersja mobilna lub lokalny scroll. |
| Skeleton, Loader | Oczekiwanie; pusty stan wyjaśnia następny krok. |

Pełny katalog: [llms.txt](https://appica.dev/ui/react/llms.txt). Zanim napiszesz własny komponent, sprawdź, czy biblioteka go nie ma. Ikony: `@appica/icons-react`.

## Podłączenie w aplikacji

Aplikacja: [apps/frontend](../apps/frontend). Stan na 2026-10-03, `@appica/ui-react` 1.2, według [instalacji](https://appica.dev/ui/docs/react/installation) i [motywów](https://appica.dev/ui/docs/react/theming).

1. `src/app/globals.css` importuje kolejno: `tailwindcss`, `@appica/ui-react/styles.css` (bazowe tokeny biblioteki), `src/shared/styles/appica-theme.css` (nasze wartości). Te same selektory i późniejsze źródło sprawiają, że nasze wartości wygrywają.
2. `@source` wskazuje `node_modules/@appica/ui-react/dist` ścieżką względną; bez tego klasy komponentów się nie wygenerują.
3. `ThemeProvider` (`src/app/providers.tsx`) ma motywy `civic` i `signal`, mapowane na klasy `light` i `dark` na `<html>`. Domyślny jest Civic, `enableSystem` jest wyłączone, więc systemowy tryb ciemny nie zmienia motywu. Wybór trafia do `localStorage` (`smart-city-theme`); skrypt providera ustawia klasę przed pierwszym renderem.
4. Model tokenów Appica jest oparty na rolach: `foreground-*`, `background-*`, `border-*` oraz skale akcentów `primary`, `secondary`, `error`, `success`, `warning`, `info` (`subtle`, `soft`, `muted`, bazowy, `strong`, `emphasis`, `intense`, `foreground`). Wariant `dark:` oznacza Signal.
5. `background` to powierzchnia karty. Strona Civic używa `background-subtle` (#F5F7FA), a strona Signal `background` (#090A0F); ustawia to `body` w layoucie.
6. `*-foreground` to kolor tekstu zarówno na bazowym, jak i na `*-muted` wypełnieniu, np. w Badge. Dlatego w Civic `muted` jest ciemnym, pełnym odcieniem z białym tekstem, a w Signal jasnym pastelem z ciemnym tekstem. Pary sprawdzono wzorem WCAG: wszystkie ≥ 5:1, obramowanie pola ≥ 3:1.
7. Klasy semantyczne: `bg-background`, `text-foreground-intense`, `border-border-strong`, `bg-primary text-primary-foreground`, `bg-brand-accent`. Nie wpisuj hexów w komponentach.

Wykresy wymagają etykiet lub wzorów; sama paleta nie gwarantuje czytelności danych. Paleta wykresów nie jest jeszcze przeniesiona — dodaj ją razem z pierwszym wykresem.
