# Resident incident map

Workstream 1 / Rafal, [#28](https://github.com/delve-group/smart-city/issues/28). The public projection is fixed in [workflow contracts §2 and §4](workflow-contracts.md#public-incident); Franek owns its PostgreSQL producer and contribution rules.

## Preparation status

The `feature/resident-incidents` branch prepares the strict `PublicIncident` runtime schema and Appica presentation: separate assessment and response badges, public template timeline, distinct-support membership states, location/reference/update facts and nearby incidents. No private report narrative, unit detail, resident/session ID or internal note is accepted by this schema. Corroboration is not official verification, and a highlighted map place is not a measured outage boundary.

These components are not yet connected to the live map. The complete map migration waits for citizen intake [PR #49](https://github.com/delve-group/smart-city/pull/49) to merge and for Franek's review of the remaining route retirement. This preparation does not complete #28 or establish its manual acceptance.

## Coordinated cutover

Migrate the category envelope and all callers, data hook, markers/heat, category counts, local incident/place search, tooltip, detail, nearby list and contribution together. The resident browser consumes server-issued `viewer_support` and contribution results; it never derives identity membership from localStorage or increments counters itself. Keep resolved/closed incidents visible as history. Explicitly linked fictional fixtures remain demo data; legacy raw counters are not converted into invented identities.

The integrated hook must poll every three seconds while the page is visible, pause hidden tabs, refresh after own writes, retain successful data with an age/stale indicator on errors and preserve intake edits. After all callers migrate, retire `GET /api/reports` and `POST /api/reports/{id}/confirmations` with `410 endpoint_retired`. Canonical owned-draft POST remains unchanged. Preserve the existing user-location dot and the explicitly labelled database-free `dev:ui` preview.

## Remaining verification

Against real integrated APIs, review public-field disclosure, repeated support and two reports from one identity, finished-incident rejection/history, controlled status/timeline updates and observed refresh delay, hidden-tab polling, retained stale data and unsaved intake preservation. Review keyboard, 390/1440 px and light/dark. Record evidence on #28 and #35; fixtures or a passing build do not establish integration acceptance. The final institution response rehearsal remains #35.
