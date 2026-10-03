# Citizen reporting — Rafal

Own the resident browser experience and ElevenLabs/location adapters: `features/city-map`, `features/report-issue`, new voice features, their `src/api/` clients, `server/voice`, location resolution and corresponding thin routes. Follow the specific Issue for shared components and application-page changes. A navigation/view control does not grant staff permissions.

Franek supplies the owned draft/confirmation/submission and public-incident services. Both form and ElevenLabs tools call the same service contract. Keep the draft ID, revision and submission identity across reconnection and form fallback. Only a committed server reference is success. A confirmation is invalidated when the draft changes.

Read the ElevenLabs section of the technical plan before selecting SDK calls or credential types. Provider credentials stay server-side; the browser uses the configured private agent. Voice teardown must stop microphone capture. Keep provider-unavailable and microphone-denied form paths usable. Read current provider documentation when implementing; the plan's provider observations are not a live integration result.

Own the complete public map migration: data hook, categories/envelopes, GeoJSON/heat, counts, search, detail, nearby list and affected action. Consume `PublicIncident` and deduplicated server contributions; keep private report text out of public UI. The shared-contract Issue defines two safe stages: citizen form submission switches canonical POST first; the map/category/read/contribution cutover follows together. Remove only each stage's obsolete compatibility paths, with Franek reviewing server changes, so current callers keep working. Agent-3 owns the search backend; this workstream owns its public UI integration.

Guest recovery and any optional labelled resident identity simulation stay in this workstream. Existing staff accounts and 30-day session policy remain the authentication baseline. Close citizen issues only with the corresponding real API flow exercised, including draft recovery, error preservation and the specified keyboard/theme/viewport review.
