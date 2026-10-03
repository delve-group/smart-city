# Geospatial data and Geoportal

Updated: 2026-10-03. Research done before implementing a map of Kraków.

## Goal of the first version

The first view should allow free panning and zooming of a map of Kraków. Buildings and parcels should later work as vector features that can be coloured, filtered and selected. "Walking around the city" at this stage means map navigation; street-level panoramic imagery would need a separate source.

## Recommended sources

| Need | Source and standard | Use |
| --- | --- | --- |
| Readable city base map | [BDOT10k + BDOO, WMTS](https://mapy.geoportal.gov.pl/wss/service/WMTS/guest/wmts/BDOT10k-BDOO) | Fast tiles for basic city navigation. |
| Aerial view | [Standard orthophoto, WMTS](https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution) | Optional base map the user can switch to. |
| Registered buildings | [MSIP Kraków, WFS](https://msip3.um.krakow.pl/server/services/Pobieranie/Budynki/MapServer/WFSServer) | Geometry and attributes for custom styling, selection and filtering. |
| Registered parcels | [MSIP Kraków, WFS](https://msip3.um.krakow.pl/server/services/Pobieranie/Dzialki/MapServer/WFSServer) | Parcel boundaries and identification. |
| Local zoning plans and land use | [MSIP Kraków, WFS](https://msip3.um.krakow.pl/server/services/Pobieranie/BP_MPZP_POBIERANIE/MapServer/WFSServer) | Checking whether investments match land use. |
| Quick land-registry image without geometry handling | [MSIP Kraków, WMS](https://msip.um.krakow.pl/uslugi/services/WMS/EGIB_WMS/MapServer/WMSServer) | Ready-made image of parcels and buildings, useful as a fallback or preview. |

MSIP also publishes layers for addresses, districts, BDOT500 and utility networks. The full list is in the [MSIP data catalogue](https://msip.krakow.pl/228340,artykul,katalog-danych.html). The national Geoportal additionally provides orthophotos, terrain, topographic data and aggregated land-registry services in the [GUGiK service list](https://www.geoportal.gov.pl/pl/usluga/wykaz-uslug/).

Kraków also publishes a [2023 city mesh model](https://msip.krakow.pl/dataset/2861) as five ArcGIS SceneServer services. It could support a later 3D view with a free camera. It does not replace Street View panoramas and raises integration cost, so it is not part of the first version.

## Access and limits

- The listed services are publicly published. Their catalogues do not mention login, registration or an API key; integration starts without secrets.
- No key does not mean a guaranteed SLA or unlimited traffic. Before implementing, read `GetCapabilities` and confirm layer names, coordinate system, response format and feature limits.
- For WFS, fetch only features in the current map extent (`bbox`) and only from a useful zoom level. Never load the whole city into the browser.
- Direct requests from the frontend depend on each service's CORS. Check in the browser first; add a small proxy endpoint only if CORS, response format or stability require it.
- Keep source attribution and check reuse terms before a public deployment. Label demo data and local copies with the date they were obtained.

## Implementation direction

The event heatmap runs on MapLibre GL with OpenFreeMap tiles (D013). The direction below applies to future official layers.

OpenLayers handles WMTS, WMS, WFS, reprojection and vector layers in one client. MapLibre can also display WMS/WMTS raster layers in Web Mercator and GeoJSON from WFS, so check whether a service offers EPSG:3857 before choosing a client. Start with buildings from WFS loaded by `bbox`; add parcels and other layers only for an approved demo scenario.

The map data adapter should map WFS responses to a small app type and report loading, no data, service error and limit exceeded separately. The map UI should not depend on raw provider field names.

## Open checks before coding

1. Does the buildings WFS work directly from the app's domain and return a format convenient for the chosen map client?
2. What are the layer and field names for buildings, and do they include the attribute needed for the planned classification?
3. What are the feature limits, a sensible minimum zoom, and the service behaviour with a large `bbox`?
4. Which attributions and terms of use must be shown next to the map?

## Official sources

- [MSIP buildings WFS catalogue](https://msip.krakow.pl/dataset/3198)
- [MSIP parcels WFS catalogue](https://msip.krakow.pl/dataset/3189)
- [MSIP zoning plans WFS catalogue](https://msip.krakow.pl/dataset/2646)
- [Geoportal land registry and WMS/WFS services](https://www.geoportal.gov.pl/pl/dane/ewidencja-gruntow-i-budynkow-egib/)
- [Orthophoto description and GUGiK service addresses](https://www.geoportal.gov.pl/pl/dane/ortofotomapa-orto/)
