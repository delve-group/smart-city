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

The canonical runtime schemas/types are in `apps/frontend/src/api/locations/types.ts`; the browser calls `resolveLocation` from `src/api/locations/resolve-location.ts`. The result contains `status`, up to five `candidates`, and a nullable `pin`, inside the common `data`/`correlation_id` envelope.

| Status | Meaning and resident action |
| --- | --- |
| `candidates` | One address candidate; explicitly select and check it on the map. |
| `ambiguous` | Several candidates; explicitly select the correct one or correct the query. |
| `unresolved` | No usable address; correct the query or confirm the exact pin. |
| `unavailable` | Provider request failed, timed out or returned an invalid envelope; retry or confirm the exact pin. This is not an empty successful search. |
| `outside_city` | Supplied pin is outside the configured reporting rectangle; move it inside. No candidate/pin is returned. |

A candidate follows the canonical `LocationResult` in [shared workflow contracts](workflow-contracts.md#location-result): `candidate_id`, `source` (`geocoder`, `map_pin`, `device`), `label`, `lat`, `lng`, nullable `street`/`building_number`/`district`, and `precision` (`building`, `street`, `point`). Photon identities use `photon:<osm_type>:<osm_id>`. Bare map pins have a null candidate ID and retain exact supplied coordinates. Missing building/street facts stay null; a name alone does not establish a building address. IDs identify geography results, not residents, known assets or institution service areas. The resolver emits `geocoder`/`map_pin`; `device` is accepted by the shared storage shape for confirmed device locations.

## Provider and confirmation behavior

The existing public [Photon service](https://github.com/komoot/photon) supplies address suggestions. Search requests include the reporting bounding box and a Kraków bias; results are independently checked for the bounds and a Kraków city label. Polish place names are preserved. The reporting rectangle in `src/shared/utils/krakow.ts` is the existing PoC limit, not a municipal polygon. Requests have a five-second timeout and are cancelled when the browser query or pin changes. There are no automatic provider retries; address search runs on Find and pin lookup is debounced. Public Photon is fair-use infrastructure, not a production integration.

Reverse lookup returns nearby suggestions separately from the exact supplied pin. A pin retains `point` precision and null street/building facts even when a nearby address is found. The picker displays the coordinates and does not silently move to a nearby building. Address selection deliberately moves the map to that candidate and remains selected during the animation; a resident camera gesture clears it. Confirm location saves the selected candidate or the exact pin to the owned draft. This UI action is separate from the persistent summary/revision confirmation required for submission.

The form creates/recovers a guest-owned draft through the shared intake APIs. Valid edits save after a 1.2-second pause; incomplete/invalid input stays visible with an unsaved indicator. Review report explicitly saves the current fields. Category/issue type come from the server catalogues; original Polish observations and unit details stay private, and unknown scope/time remain explicit. A location change saves the selected geography while preserving other entered fields and invalidating the old confirmation.

The resident explicitly confirms the server readback for the current revision before canonical `POST /api/reports { draft_id, revision }`. Any edit removes the UI confirmation and the server invalidates it on save. A dropped submission response triggers `GET /api/report-drafts/{id}` before retry; its committed reference is authoritative even if the current report-status read fails. Saved references and pending/review/private/out-of-scope next steps are shown separately from the public map. Browser storage contains only `mradar-resident-draft` (the draft ID); the submission key remains server-issued and is reused across recovery. No full narrative/transcript is stored in browser recovery storage.

Raw-create POST compatibility is retired with `400 legacy_contract_retired`; existing labelled public mock reads/contributions remain until the complete #28 map cutover. No persistent private report is added to that mock feed. The isolated local PostgreSQL manual review does not verify Docker startup, deployment or live voice switching.

`npm run dev:ui` keeps the incoming database-free preview: intake uses explicitly labelled browser fixtures and `MOCK-*` references, with a separate recovery key/store. That development mode stores fictional form data in the browser, reuses the same pure draft rules, and calls public Photon directly. It cannot authenticate or create server reports. Normal development/production stores only the recovery draft ID in browser storage and uses the authenticated application endpoints; all persistence acceptance evidence comes from that mode.

## Manual review

Use Find with a broad address and then a corrected building number. Verify choices show unknown building numbers honestly, selection moves the map, and a moved pin does not retain an old address. Review unsuccessful queries, provider failure, out-of-bounds pin, cancelled/out-of-order responses, keyboard navigation, 390/1440 px layouts and both themes. The pin must remain usable when the provider fails. Run lint, typecheck and build. Actual evidence and remaining integration gaps are recorded on #26 and its PR; this document is not an end-to-end completion claim.
