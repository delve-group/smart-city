# Resident location resolution

Implemented for [#26](https://github.com/delve-group/smart-city/issues/26), workstream 1 / Rafal, using the shared contracts and persistent intake from #21/#23. Geography itself does not save reports, confirm drafts or determine institution responsibility.

## HTTP and client boundary

`POST /api/locations/resolve` is a stateless, read-only geography lookup. It checks the configured application Origin and uses the existing success/error envelope and `Cache-Control: no-store`. Guest creation is not required for geography; the later draft/voice APIs must authenticate the resident and validate ownership themselves. Inputs are strict: unknown fields and combined address/pin inputs are rejected with `400 invalid_request`.

```json
{ "city": "Kraków", "address": "Długa 12" }
```

```json
{ "city": "Kraków", "pin": { "lat": 50.0617, "lng": 19.945 } }
```

The canonical runtime schemas/types are in `apps/frontend/src/api/locations/types.ts`; the browser calls `resolveLocation` from `src/api/locations/resolve-location.ts`. The result contains `status`, up to five `candidates`, a nullable `pin`, and optional nullable `matched_place`, inside the common `data`/`correlation_id` envelope. `matched_place` identifies a unique exact name match with its candidate ID, place name and optional validated geocoder bounds. It is display metadata, separate from `DraftLocation` and affected scope.

| Status | Meaning and resident action |
| --- | --- |
| `candidates` | One address or named-place candidate; check it on the map and include it in the confirmed report readback. |
| `ambiguous` | Several candidates; explicitly select the correct one or correct the query. |
| `unresolved` | No usable address; correct the query or confirm the exact pin. |
| `unavailable` | Provider request failed, timed out or returned an invalid envelope; retry or confirm the exact pin. This is not an empty successful search. |
| `outside_city` | Supplied pin is outside the configured reporting rectangle; move it inside. No candidate/pin is returned. |

A candidate follows the canonical `LocationResult` in [shared workflow contracts](workflow-contracts.md#location-result): `candidate_id`, `source` (`geocoder`, `map_pin`, `device`), `label`, `lat`, `lng`, nullable `street`/`building_number`/`district`, and `precision` (`building`, `street`, `point`). Photon identities use `photon:<osm_type>:<osm_id>`. Bare map pins have a null candidate ID and retain exact supplied coordinates. Missing building/street facts stay null; a name alone does not establish a building address. IDs identify geography results, not residents, known assets or institution service areas. The resolver emits `geocoder`/`map_pin`; `device` is accepted by the shared storage shape for confirmed device locations.

## Provider and confirmation behavior

Named places retain their name before the address in `label`, for example `Tauron Arena Kraków — Stanisława Lema 7`. When exactly one actual place name matches the query (ignoring case, diacritics and the Kraków city qualifier), the resolver returns that place instead of mixing it with similarly named stops. Multiple records with the same exact name remain ambiguous; geocoder order alone never establishes identity. A small query normalization handles Polish forms such as `na Tauron Arenie`; it supplies no coordinates or guessed addresses. Live geography on 2026-10-04 returned the arena and its extent for those forms. [The venue's contact page](https://www.tauronarenakrakow.pl/kontakt/) separately confirms its postal address. Other landmarks depend on actual geocoder data and an exact name match.

Voice previews the first returned candidate before handing the result to the agent, including during ambiguous-address clarification. The tool result identifies that provisional map target; the agent starts its question with the same label and resolves corrections immediately. A unique named venue is sufficient to continue; a floor, sector or toilet detail can refine the observation without demanding unrelated street numbers. The map marks the place under discussion and, when available, draws its approximate geocoder extent. This rectangle is not a surveyed footprint or an assertion that the whole venue is affected. Unresolved/unavailable lookups clear the preview; the owned draft changes only through `prepare_report` and still needs revision confirmation before submission. See [voice map preview](voice-sessions.md#voice-location-map-preview--2026-10-04).

The existing public [Photon service](https://github.com/komoot/photon) supplies address suggestions. Search requests include the reporting bounding box and a Kraków bias; results are independently checked for the bounds and a Kraków city label. Polish place names are preserved. The reporting rectangle in `src/shared/utils/krakow.ts` is the existing PoC limit, not a municipal polygon. Requests have a five-second timeout and are cancelled when the pin changes. There are no automatic provider retries; pin lookup is debounced. Public Photon is fair-use infrastructure, not a production integration. The address-query input remains on the API; the resident picker does not search by street.

Reverse lookup returns nearby suggestions separately from the exact supplied pin. A pin retains `point` precision and null street/building facts even when a nearby address is found. The picker shows the nearest place name and does not move the camera onto it. Dragging the map is how the resident places the pin. Every Report action creates a fresh draft and centres its pin on the browser location when it is available; a drag before the position arrives keeps the current view. Confirm location saves that exact pin to the owned draft.

The form creates/recovers a guest-owned draft through the shared intake APIs. Valid edits save after a 1.2-second pause. The resident supplies category, summary, optional note, affected scope and severity. Form intake records the observation time when reporting starts and uses the generic `other` issue type internally instead of exposing the server taxonomy. Unit details stay private. A location change saves the selected geography while preserving other entered fields and invalidating the old confirmation.

Send performs the required save, revision confirmation and canonical `POST /api/reports { draft_id, revision }` as one resident action; the server confirmation contract remains intact without a separate readback card. Any edit invalidates an earlier server confirmation. A dropped submission response triggers `GET /api/report-drafts/{id}` before retry; its committed reference is authoritative even if the current report-status read fails. Saved references and pending/review/private/out-of-scope next steps are shown separately from the public map. Browser storage contains only `mradar-resident-draft` (the draft ID); the submission key remains server-issued and is reused across recovery. No full narrative/transcript is stored in browser recovery storage.

Raw-create POST compatibility is retired with `400 legacy_contract_retired`; existing labelled public mock reads/contributions remain until the complete #28 map cutover. No persistent private report is added to that mock feed. The isolated local PostgreSQL manual review does not verify Docker startup, deployment or live voice switching.

### Saved-report status feedback

The saved-report view's **Check status** action shows an Appica spinner and a localized checking label while recovering the same owned draft/report, with a 15-second read deadline. It announces the time of a successful check even when the report status is unchanged. The time describes the browser's completed read, not when city assessment progressed. A failed read preserves the saved reference/current status, displays the existing recovery error and does not announce a successful check. Repeated clicks and new-report creation are disabled during the read; keyboard focus remains on the checking button. Feedback resets for a different report. English and Polish follow the map's shared language setting.

`npm run dev:ui` keeps the incoming database-free preview: intake uses explicitly labelled browser fixtures and `MOCK-*` references, with a separate recovery key/store. That development mode stores fictional form data in the browser, reuses the same pure draft rules, and calls public Photon directly. It cannot authenticate or create server reports. Normal development/production stores only the recovery draft ID in browser storage and uses the authenticated application endpoints; all persistence acceptance evidence comes from that mode.

## Manual review

Drag the pin, including outside the city and while lookup is slow or failing. Confirm saves the exact coordinates. Opening Report moves the camera to the shared browser location and does not do so again when the resident changes an already chosen spot. Review provider failure, out-of-bounds pin, cancelled/out-of-order responses, keyboard navigation, 390/1440 px layouts and both themes. The pin must remain usable when the provider fails. Run lint, typecheck and build. Actual evidence and remaining integration gaps are recorded on #26 and its PR; this document is not an end-to-end completion claim.
