# Design system — Smart City

Dwa motywy, wspólna struktura komponentów shadcn/ui. Źródłem wartości jest [themes.css](../design-system/themes.css); [wzornik](../design-system/preview.html) prezentuje ich użycie. To autorskie palety inspirowane referencjami, nie oficjalne identyfikacje wizualne tych serwisów.

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
- Akcje dotykowe co najmniej 44 × 44 px. Ikony jednej rodziny (propozycja: Lucide), zwykle 20 px. Przycisk ikonowy zawsze ma dostępną nazwę.
- Focus widoczny: obrys 2 px tokenem `ring`, odstęp 3 px. Status zawsze ma tekst; kolor jest dodatkową informacją. Respektuj `prefers-reduced-motion`.
- Cel kontrastu: zwykły tekst minimum 4.5:1; istotne granice kontrolek i focus 3:1 względem przylegającego tła. Token `border` służy podziałom dekoracyjnym; kontrolki używają mocniejszego `input`. Dostępność całego ekranu wymaga ręcznej oceny po wdrożeniu.

## Komponenty shadcn/ui

| Komponent | Reguła użycia |
| --- | --- |
| Button | Jedna dominująca akcja na sekcję; secondary/outline dla pozostałych. Destructive tylko dla działania destrukcyjnego. |
| Card, Separator | Grupowanie treści; unikaj wielopiętrowych kart. |
| Input, Textarea, Label, Field | Trwała etykieta, opis i błąd powiązany przez `aria-describedby`; placeholder nie zastępuje etykiety. |
| Select, Checkbox | Wybór wartości zgodny z semantyką; klawiatura obsługiwana przez bazowy komponent. |
| Alert, Badge | Komunikat i nazwany status; błąd formularza również przy polu. |
| Dialog / Sheet | Tytuł, opis, zamykanie Escape i powrót focusu. Portal ma dziedziczyć motyw z `html`. |
| Table | Nagłówki kolumn, etykiety danych; wersja mobilna lub lokalny scroll. |
| Skeleton / Empty | Oczekiwanie i brak wyników; pusty stan wyjaśnia następny krok. |

Dodawaj tylko komponenty wymagane przez implementowany ekran. Wzornik HTML demonstruje stylistykę natywnymi elementami; nie jest implementacją shadcn/ui.

## Podłączenie do aplikacji

Model tokenów opiera się na [dokumentacji shadcn/ui](https://ui.shadcn.com/docs/theming), sprawdzonej 2026-10-03. Konfiguracja `components.json` ma używać `tailwind.cssVariables: true`. Przy uruchomieniu aplikacji postępuj według [instalacji dla Vite](https://ui.shadcn.com/docs/installation/vite).

1. Zainicjalizuj aplikację i shadcn/ui. Pozostaw importy bazowe wymagane przez wygenerowaną wersję.
2. W `src/styles/globals.css` po importach bazowych dodaj poniższe importy (ścieżki dotyczą planowanej struktury):

```css
@import "../../design-system/themes.css";
@import "../../design-system/tailwind-theme.css";
```

3. Usuń kolidujące domyślne bloki `:root`, `.dark` i mapowania tokenów wygenerowane przez CLI. Utrzymuj jedno źródło kolorów. Mapowanie Tailwind zakłada wersję 4 i pełne wartości CSS, np. `var(--primary)`, nie `hsl(var(--primary))`.
4. Ustaw `data-theme="civic"` lub `data-theme="signal"` na `html`. Domyślny `:root` zapewnia Civic bez JavaScript. Wariant Tailwind `dark:` jest przypisany do Signal w pliku mapowania; nie utrzymuj drugiego, niezależnego przełącznika `.dark`.
5. Używaj klas semantycznych: `bg-background text-foreground`, `bg-primary text-primary-foreground`, `border-input`, `ring-ring`. Nie wpisuj hexów w komponentach.
6. Jeśli wybór jest zapisywany, odczytaj wyłącznie dozwolone wartości przed pierwszym renderem; przy niedostępnym storage wróć do Civic. Nie mapuj automatycznie systemowego dark mode na tożsamość motywu.

Tokeny obejmują także popovery, sidebar, pięć kolorów wykresów i statusy. Wykresy wymagają dodatkowo etykiet lub wzorów; sama paleta nie gwarantuje czytelności danych.
