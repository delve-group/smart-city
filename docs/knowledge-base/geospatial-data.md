# Dane przestrzenne i Geoportal

Aktualizacja: 2026-10-03. Stan rozpoznania przed implementacją mapy Krakowa.

## Cel pierwszej wersji

Pierwszy widok ma pozwalać swobodnie przesuwać i przybliżać mapę Krakowa. Budynki i działki mają później działać jako obiekty wektorowe, które można kolorować, filtrować i wybierać. „Spacer po mieście” oznacza na tym etapie nawigację po mapie; widok uliczny ze zdjęć panoramicznych wymaga osobnego źródła.

## Rekomendowane źródła

| Potrzeba | Źródło i standard | Zastosowanie |
| --- | --- | --- |
| Czytelny podkład miasta | [BDOT10k + BDOO, WMTS](https://mapy.geoportal.gov.pl/wss/service/WMTS/guest/wmts/BDOT10k-BDOO) | Szybkie kafelki do podstawowej nawigacji po mieście. |
| Widok lotniczy | [Ortofotomapa standardowa, WMTS](https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution) | Opcjonalny podkład przełączany przez użytkownika. |
| Budynki ewidencyjne | [MSIP Kraków, WFS](https://msip3.um.krakow.pl/server/services/Pobieranie/Budynki/MapServer/WFSServer) | Geometrie i atrybuty do własnego stylu, wyboru i filtrowania. |
| Działki ewidencyjne | [MSIP Kraków, WFS](https://msip3.um.krakow.pl/server/services/Pobieranie/Dzialki/MapServer/WFSServer) | Granice i identyfikacja działek. |
| Plany miejscowe i przeznaczenie terenu | [MSIP Kraków, WFS](https://msip3.um.krakow.pl/server/services/Pobieranie/BP_MPZP_POBIERANIE/MapServer/WFSServer) | Analiza zgodności inwestycji i funkcji terenu. |
| Szybki obraz EGiB bez obsługi geometrii | [MSIP Kraków, WMS](https://msip.um.krakow.pl/uslugi/services/WMS/EGIB_WMS/MapServer/WMSServer) | Gotowy obraz działek i budynków, przydatny jako wariant awaryjny lub podgląd. |

MSIP publikuje też warstwy adresów, dzielnic, BDOT500 i sieci uzbrojenia terenu. Pełny wykaz znajduje się w [katalogu danych MSIP](https://msip.krakow.pl/228340,artykul,katalog-danych.html). Geoportal krajowy udostępnia dodatkowo ortofotomapy, rzeźbę terenu, dane topograficzne i zbiorcze usługi EGiB w [wykazie usług GUGiK](https://www.geoportal.gov.pl/pl/usluga/wykaz-uslug/).

Kraków publikuje również [model mesh miasta z 2023 roku](https://msip.krakow.pl/dataset/2861) jako pięć usług ArcGIS SceneServer. Może posłużyć do późniejszego widoku 3D z wolną kamerą. Nie zastępuje zdjęć panoramicznych Street View i zwiększa koszt integracji, dlatego nie należy do pierwszej wersji.

## Dostęp i ograniczenia

- Wymienione usługi są publicznie opublikowane. Ich katalogi nie opisują logowania, rejestracji ani klucza API; integrację zaczynamy bez sekretów.
- Brak klucza nie oznacza gwarantowanego SLA ani nieograniczonego ruchu. Przed implementacją odczytaj `GetCapabilities` i ustal nazwy warstw, układ współrzędnych, format odpowiedzi oraz limity liczby obiektów.
- Dla WFS pobieraj tylko obiekty z aktualnego obszaru mapy (`bbox`) i dopiero od użytecznej skali. Nie pobieraj całego Krakowa do przeglądarki.
- Bezpośrednie żądania z frontendu zależą od CORS konkretnej usługi. Najpierw sprawdź je w przeglądarce; dodaj mały endpoint pośredniczący tylko wtedy, gdy CORS, format odpowiedzi lub stabilność tego wymagają.
- Zachowaj informację o źródle danych i sprawdź warunki ponownego wykorzystania przed publicznym wdrożeniem. Dane demonstracyjne i lokalne kopie oznacz datą pozyskania.

## Kierunek implementacji

Mapa cieplna zdarzeń działa na MapLibre GL z kafelkami OpenFreeMap (D013). Poniższy kierunek dotyczy przyszłych warstw urzędowych.


Użyj OpenLayers, ponieważ w jednym kliencie obsługuje WMTS, WMS, WFS, reprojekcję i warstwy wektorowe. Zacznij od podkładu WMTS i centrum Krakowa. Następnie dołącz WFS budynków ładowany według `bbox`; działki i kolejne warstwy dodawaj dopiero dla zatwierdzonego scenariusza demonstracyjnego.

Adapter danych mapy ma mapować odpowiedź WFS na mały typ domenowy i raportować osobno: ładowanie, brak danych, błąd usługi oraz przekroczenie limitu. UI mapy nie powinno zależeć od surowych nazw pól dostawcy.

## Otwarte sprawdzenia przed kodowaniem

1. Czy WFS budynków działa bezpośrednio z docelowej domeny aplikacji i zwraca format wygodny dla OpenLayers.
2. Jak nazywają się warstwy i pola budynków oraz czy zawierają atrybut potrzebny do planowanej klasyfikacji.
3. Jakie są limity liczby obiektów, sensowna minimalna skala i zachowanie usługi przy dużym `bbox`.
4. Jakie atrybucje i warunki wykorzystania trzeba pokazać przy mapie.

## Źródła urzędowe

- [Katalog WFS budynków MSIP](https://msip.krakow.pl/dataset/3198)
- [Katalog WFS działek MSIP](https://msip.krakow.pl/dataset/3189)
- [Katalog WFS miejscowych planów MSIP](https://msip.krakow.pl/dataset/2646)
- [Opis EGiB i usług WMS/WFS Geoportalu](https://www.geoportal.gov.pl/pl/dane/ewidencja-gruntow-i-budynkow-egib/)
- [Opis ortofotomapy i adresy usług GUGiK](https://www.geoportal.gov.pl/pl/dane/ortofotomapa-orto/)
