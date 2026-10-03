# Browser voice integration

Scope: #29, taken over from Rafal at the user's request. Complete the local response flow before deploying it.

Use one application-owned voice feature around the pinned ElevenLabs React SDK. The resident chooses voice or the existing exact-pin form from the reporting entry point. Voice starts an empty owned draft; unknown observation time and scope remain unknown. Form behavior stays as agreed in D060. Switching from voice to form stops capture and recovers the same draft, revision and committed submission rather than starting another report.

The server reserves a five-minute session against the resident actor before asking the fixed private agent/version for a WebRTC credential. A short actor-row lock serializes starts; external calls happen outside the transaction. Limit each resident to one active reservation and five starts in ten minutes. Failed provider requests release their reservation, while still counting as a start. The lease bounds application tool access; provider duration and SDK disconnect must be verified separately.

Five strict session-bound operations delegate to existing domain services: location lookup, public incident search, draft preparation, current-revision confirmation and canonical submission. The dispatcher cannot choose a resident/draft, invent coordinates or invoke staff operations. Location candidates are kept on the session from the actual resolver response. Draft edits invalidate confirmation. Explicit agreement must cover the returned revision, and only a persisted reference is success. An unknown HTTP outcome is reconciled through the owned draft.

Keep conversation tokens and transcripts in memory; no raw audio, token or full transcript is stored by the application. The UI supplies start, mute, end, connection/error feedback and a form fallback. Provision client tools explicitly through a setup command, read their definitions back and repin the agent version in ignored configuration. Startup reports unavailable voice configuration by variable name without preventing form intake.

Verification follows the repository's PoC rules: no new automated tests; run lint, typecheck and production build, manually exercise ownership/origin/limits/revision/replay and failure recovery, then actual WebRTC conversations and keyboard/theme/mobile review. API-only scenarios and minted tokens do not satisfy spoken-conversation acceptance.
