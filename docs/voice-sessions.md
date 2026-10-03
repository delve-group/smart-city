# Voice session and tool API

Local implementation for #29; browser SDK wiring and spoken-conversation acceptance remain unfinished. Root Compose forwards the three optional server-only `ELEVENLABS_*` settings to the web application. After dependency or environment changes, rebuild/recreate the development app and apply migrations using the root startup commands. Migration `008_voice_sessions.sql` holds resident/draft reservations, provider conversation identity and the last actual location candidates. It stores no credential, audio or transcript.

All routes require the existing resident session and exact `APP_ORIGIN`; all responses use the common no-store envelope. Obtain/recover a guest and an owned draft through the existing intake API first. Staff sessions cannot obtain resident voice authority.

| Route | Request | Result |
| --- | --- | --- |
| `POST /api/voice/sessions` | `{ draft_id }` | `201 { id, draft_id, expires_at, conversation_token }`. The token is a browser WebRTC credential, not the provider API key. Keep it in memory. |
| `POST /api/voice/sessions/{id}/tools` | One operation below | `200` domain result. Draft/report writes also include the changed revision/version in the envelope. |
| `POST /api/voice/sessions/{id}/end` | No body | `200 { ended: true, draft }`; idempotent, including after expiry. Reconcile any submitted reference from this owned draft. |

Tool payloads are strict and limited to 16 KB. Neither model identity/draft authority nor arbitrary location coordinates are accepted.

| Operation | Arguments beyond `operation` | Result |
| --- | --- | --- |
| `resolve_location` | `address` | Existing bounded Kraków `LocationResolution`; candidate IDs are cached on this session. |
| `find_incidents` | `query` | Public incident-only hybrid `SearchPage`, through existing scoped search. |
| `prepare_report` | `expected_revision`, `fields` (partial draft fields excluding location), optional `candidate_id`, optional private `unit` | `IntakeDraft`. A location must come from the last actual lookup or the draft's existing form-selected location; a unit-only edit preserves that location. |
| `confirm_report_draft` | `revision`, `explicit_agreement: true` | `IntakeDraft` confirmed through the voice channel. This declaration does not prove the user spoke consent; the browser/conversation must obtain it after readback. |
| `submit_report` | `revision` | `{ report, replayed }`, using the canonical transactional submission service and existing draft submission identity. |

Errors preserve common authentication, origin, ownership, validation and revision behavior. An active lease returns `429 voice_session_active`; five starts in ten minutes return `429 voice_start_limit`. Submitted drafts reject a new voice session. Expired/ended tool access returns `409 voice_session_ended`. Missing configuration or provider rejection/unavailability returns safe `503 voice_unavailable`. Failed provider starts release the local reservation. Optional startup diagnostics name missing/invalid variables and leave form intake available. Mock UI clients reject voice explicitly and retain the form; they never simulate a live provider conversation.

## Local evidence — 2026-10-03

Verified against Docker development app, PostgreSQL and real ElevenLabs private preparation agent; no WebRTC connection or microphone capture started.

- Applied migration 008. Two simultaneous starts by one guest yielded one `201` credential and one `429`; lease was 300 seconds, response was no-store and exposed only the documented fields. Five starts/end cycles succeeded; sixth was rejected with `voice_start_limit`.
- No session: `401`; wrong Origin: `403`; another resident's draft/session/end: `404`. Agent injection, staff operation, arbitrary coordinates, invented candidate and unit without location: `400`. Malformed session UUID: `404`.
- A real official login was denied voice access with `403`. A locally advanced lease expiry rejected tool access, allowed a replacement for the same draft, and an app restart retained the active lease/owned draft until explicit end. Advancing the database clock for this case does not verify elapsed provider timeout.
- Actual Photon lookup for Dietla 64 returned two candidates. Selecting a returned candidate prepared the draft. Correction cleared confirmation and preserved unknown observation time; old confirmation/submission was rejected. The current revision saved `R-26-001016` with channel `voice`, and replay returned the same report. Ending/repeating end recovered that committed reference; tools after end were rejected.
- With web-only API key temporarily unset, session creation returned `503`, health remained `200` and the same normal form APIs saved fictional fallback report `R-26-001017`.
- With a deliberately invalid local provider key, two successive starts returned safe `503` (no stuck active reservation); owned draft remained readable at revision 1. Actual local configuration was restored afterward.
- Lint, typecheck and production build passed. Runtime-dependency audit reported zero vulnerabilities. No automated tests were added.
- Explicit provider tool setup created/read back five reviewed client tools, repeat setup reused them and the checker verified the integrated private version. After loading that pin, the owned HTTP route minted and ended a credential. Agent settings/tool count are checked before issuance; this is still not a live WebRTC conversation.

Still required: SDK/Appica UI, three real scripted voice conversations, microphone denial/stop/navigation/disconnect behavior, provider-side timeout/cleanup and elapsed retention, capacity/latency and final browser/deployed rehearsal. Provider tool definitions and the integrated immutable pin have been verified. API transport evidence must not be reported as voice acceptance or used to close #29/#35.
