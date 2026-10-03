# ElevenLabs dispatcher setup

Workstream 1 / Rafal, [#29](https://github.com/delve-group/smart-city/issues/29), now taken over on the user's machine. Provider setup, the local [owned session/tool API and browser panel](voice-sessions.md) are implemented. A real WebRTC greeting exchange, mute/end and provider completion without retained audio are verified locally. Complete scripted spoken-report acceptance remains unfinished.

## Local credential and access

Put `ELEVENLABS_API_KEY` in the ignored repository-root `.env`. Setup needs ElevenAgents / Conversational AI read and write permissions; a speech-only key is insufficient. Provider credentials stay in server/CLI code. Scope/quota controls are described in [API authentication](https://elevenlabs.io/docs/api-reference/authentication).

From `apps/frontend`, provision the private preparation agent and then run the read-only checker:

```sh
node --env-file=../../.env --conditions=react-server --import tsx scripts/voice-setup.ts
node --env-file=../../.env --conditions=react-server --import tsx scripts/voice-check.ts
```

Setup creates a **private, tool-free** agent, verifies its settings, and writes agent/immutable version IDs to the ignored root `.env` with owner-only permissions. Repeating setup reuses an exact matching agent; it refuses ambiguous names, mismatched settings or an existing different version pin rather than updating an agent silently. It starts no conversation and exposes no browser token. If creation has an unknown outcome, run setup again so its lookup can recover the existing agent.

For integrated reporting, attach the five reviewed client tools and explicitly repin, then check:

```sh
node --env-file=../../.env --conditions=react-server --import tsx scripts/voice-tools-setup.ts
node --env-file=../../.env --conditions=react-server --import tsx scripts/voice-check.ts
```

This command reuses exact matching tool definitions, refuses ambiguous/mismatched workspace tools, verifies their actual definitions without response mocks, updates only the configured private dispatcher and saves the resulting version pin in ignored `.env`. Repeating it reads/reuses the same five tools. After integration, use this command rather than the tool-free preparation command. Recreate the local web container to load the changed version pin. Session creation checks the exact pinned agent's private settings and five distinct tools before issuing a credential. It does not silently provision or change the provider.

On 2026-10-03, actual tool provisioning and repeated setup/readback succeeded. The first create returned `response_mocks: null`; the adapter now accepts that actual empty shape and recovered the created tool through lookup without duplication. The integrated pin minted a real application-bound credential after web recreation. The initial transport check ended without connecting WebRTC; a subsequent browser check completed a real greeting exchange and explicit end. The separate evidence is recorded in [voice sessions](voice-sessions.md#browser-panel-and-local-review).

To explicitly upgrade the configured reviewed English v1 to the current Polish dispatcher:

```sh
node --env-file=../../.env --conditions=react-server --import tsx scripts/voice-tools-setup.ts --update-language
node --env-file=../../.env --conditions=react-server --import tsx scripts/voice-check.ts
```

The upgrade requires the configured previous version pin, exact v1 prompt fingerprint and greeting, unchanged private settings and the five reviewed tools. Unrelated or edited agents are rejected. Repeating setup on the exact current configuration reuses its tools and pin. On 2026-10-03 the v1-to-v2 upgrade, repeated setup and resulting provider readback succeeded; the local web app was recreated to load the new immutable pin. A subsequent real WebRTC call recognized Polish speech and replied in Polish; see the [browser evidence](voice-sessions.md#browser-panel-and-local-review). Earlier English greeting evidence is historical. Neither exchange establishes complete Polish spoken-report acceptance.

The first submitted Polish conversation exposed scope/title/address-readback defects (D065). To upgrade only the configured, pinned, exact reviewed Polish v2 to v3, use:

```sh
node --env-file=../../.env --conditions=react-server --import tsx scripts/voice-tools-setup.ts --update-prompt
```

V3 gives explicit several-buildings-to-street and English-title instructions, keeps the Polish original private, and offers map-pin fallback when address labels cannot distinguish candidates. The explicit upgrade and full provider readback passed locally. Recreate the local web app to load the resulting immutable pin; do not edit source or restart it during an elapsed-session-limit rehearsal.

The checker reports access/settings without credentials, tokens or raw provider errors. It reads the configured immutable version and creates no agent, token or conversation. On 2026-10-03, the initial key returned `401 missing_permissions`; the replacement key succeeded. One private dispatcher was provisioned, setup reuse succeeded without duplication, and its pinned settings passed read-back. Actual IDs remain in ignored local configuration, not checked-in documentation.

## Model upgrade — 2026-10-04

The user selected `gpt-6.1-sol` in place of `gpt-4.1-mini`. Upgrade an exact, pinned Polish v3 predecessor explicitly:

```sh
node --env-file=../../.env --conditions=react-server --import tsx scripts/voice-tools-setup.ts --update-model
node --env-file=../../.env --conditions=react-server --import tsx scripts/voice-check.ts
```

The model-only upgrade patches only `conversation_config.agent.prompt.llm`, preserves the five reviewed tools and saves the new immutable version in the ignored local `.env`. It rejects a different prompt, language, greeting, private configuration or predecessor model. Existing language/prompt upgrade flags also adopt the current model. Repeating setup on the current configuration does not create another version.

Actual account catalog availability, upgrade, repeated setup and new pinned readback passed. After recreating only the local app, readiness returned 200, a fresh guest obtained a real provider credential (201) for an owned empty draft, and explicit end returned that same draft (200). Lint, typecheck, build and diff checks passed. No microphone/WebRTC connection was started. The previous immutable GPT-4.1 mini version remained unchanged and readable; the production application and its old version pin were not changed. Polish speech quality, response latency and the scope defect in #66 have not been re-evaluated with the new model. Earlier spoken-report evidence below refers to GPT-4.1 mini.

## Prepared configuration

`src/server/voice/dispatcher-config.ts` supplies the English prompt and a provider configuration builder. Actual provisioned settings were read back on 2026-10-03, with the model change read back on 2026-10-04:

| Setting | Configured value | Verification |
| --- | --- | --- |
| Prompt/name | `mradar-dispatcher-v3` | Exact prompt and name read back from pinned version |
| Language/greeting | `pl`, Polish first message | Actual language and exact greeting are checked with the pinned prompt |
| LLM | `gpt-6.1-sol` | New pinned configuration read back; spoken quality and latency unverified on this model |
| Voice | `cjVigY5qzO86Huf0OWal` | Agent configuration read back; voice quality unverified |
| TTS | `eleven_v4_turbo` | Agent configuration read back; Polish recognition/voice unverified |
| Authentication | `enable_auth: true`, empty allowlist | Actual private setting read back |
| Duration | 300 seconds | Actual provider setting read back; timing/teardown unverified |
| Capacity | 15 concurrent agent conversations, 100/day, bursting disabled | Actual agent settings read back; workspace quota/capacity unverified |
| Retention | Audio recording off; `retention_days: 1`, audio/transcript deletion flags enabled, zero retention disabled | Actual configuration read back; elapsed deletion behavior unverified |

The English-authored prompt requires understanding Polish speech and replying in Polish, including clarification, readback, errors and saved references. Stored operator summaries remain English and tool readback is faithfully explained in Polish. It preserves Polish place names, asks about ambiguity and apartment/building/street scope, retains unknown time, requires fresh revision confirmation after correction and announces only a persisted reference. Emergency help is separate from demo reporting. Five dispatcher operations are allowed: `resolve_location`, `find_incidents`, `prepare_report`, `confirm_report_draft`, `submit_report`. No staff approval, execution, institution or MCP tool belongs to this agent.

The five reviewed client tools are attached using `tool_ids`; inline `tools` is deprecated in the current official API schema. Each result-dependent client tool uses `expects_response: true` and `execution_mode: immediate`, with a bounded timeout, so the conversation waits for the authenticated API result. The [local tool HTTP adapter](voice-sessions.md) rejects model-supplied draft/identity authority and invented coordinates. Browser SDK callbacks invoke those session-bound tools and reconcile the same owned draft. Actual calls during complete spoken reporting remain to be verified. [Client tool documentation](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools), [agent creation](https://elevenlabs.io/docs/eleven-agents/api-reference/agents/create).

Setup records the actual agent ID and immutable version in ignored configuration as `ELEVENLABS_AGENT_ID` and `ELEVENLABS_AGENT_VERSION_ID`. The checker verifies the exact prompt, language, greeting and resources, private authentication, capacity, five-minute duration and retention settings against that pin. The owned local session route issues [WebRTC credentials](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-webrtc-token) for that fixed agent/version after enforcing resident limits. Chrome has connected using this route. No API key reaches the browser. Tool or prompt changes require explicit repinning and loading that pin in the web application.

## Browser integration and remaining acceptance

The browser uses `ConversationProvider`, a WebRTC conversation token and controlled mute, following the [React SDK guidance](https://elevenlabs.io/docs/eleven-agents/libraries/react). `@elevenlabs/react` 1.16.0 is pinned and wired to the Appica reporting panel. This version's hook `startSession` and `endSession` return `void`: awaiting the hook alone does not await teardown. The implemented adapter retains the underlying conversation from the public lifecycle callback and awaits its actual `endSession(): Promise<void>`, with pending-connection/disconnect handling.

#26 is merged. Migration 008 and the session-bound API reuse its owned draft/revision/submission identity and canonical services; one active reservation, five starts per ten minutes and five-minute application access passed local HTTP checks. Real WebRTC connection and explicit end passed; provider readback reported the specific conversation done with no retained audio. Provider-side maximum-duration cleanup and abrupt-navigation behavior still need verification; a local lease expiry alone does not prove the provider stopped.

Stop SDK capture and all acquired microphone tracks on end, navigation, disconnect and form fallback. Keep transient transcript in memory only; persist structured draft observations through the existing intake service, never raw audio/full transcripts. Reconcile in-flight saves through the same draft before retrying. Missing configuration and microphone/provider failures retain the form.

Live acceptance still requires three actual outage conversations (ambiguous location, corrected building number, interruption), one committed reference each; denial/limits/disconnect before and after save; fresh confirmation after correction; ownership/origin and unavailable-config checks; real retention/configuration/conversation references, latency and cleanup evidence; Appica/keyboard/390/1440 px/both-theme review and application checks. Record evidence on #29 and #35, not inferred from this prepared adapter.
