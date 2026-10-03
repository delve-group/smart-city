# ElevenLabs dispatcher setup

Workstream 1 / Rafal, [#29](https://github.com/delve-group/smart-city/issues/29). This branch is provider configuration preparation permitted before citizen integration; it does not implement the browser voice flow or satisfy live acceptance.

## Local credential and access

Put `ELEVENLABS_API_KEY` in the ignored repository-root `.env`. Setup needs ElevenAgents / Conversational AI read and write permissions; a speech-only key is insufficient. Provider credentials stay in server/CLI code. Scope/quota controls are described in [API authentication](https://elevenlabs.io/docs/api-reference/authentication).

From `apps/frontend`, provision the private preparation agent and then run the read-only checker:

```sh
node --env-file=../../.env --conditions=react-server --import tsx scripts/voice-setup.ts
node --env-file=../../.env --conditions=react-server --import tsx scripts/voice-check.ts
```

Setup creates a **private, tool-free** agent, verifies its settings, and writes agent/immutable version IDs to the ignored root `.env` with owner-only permissions. Repeating setup reuses an exact matching agent; it refuses ambiguous names, mismatched settings or an existing different version pin rather than updating an agent silently. It starts no conversation and exposes no browser token. If creation has an unknown outcome, run setup again so its lookup can recover the existing agent.

The checker reports access/settings without credentials, tokens or raw provider errors. It reads the configured immutable version and creates no agent, token or conversation. On 2026-10-03, the initial key returned `401 missing_permissions`; the replacement key succeeded. One private dispatcher was provisioned, setup reuse succeeded without duplication, and its pinned settings passed read-back. Actual IDs remain in ignored local configuration, not checked-in documentation.

## Prepared configuration

`src/server/voice/dispatcher-config.ts` supplies the English prompt and a provider configuration builder. Actual provisioned settings, read back on 2026-10-03, are:

| Setting | Configured value | Verification |
| --- | --- | --- |
| Prompt/name | `mradar-dispatcher-v1` | Exact prompt and name read back from pinned version |
| LLM | `gpt-4.1-mini` | Agent configuration read back; conversation access/latency unverified |
| Voice | `cjVigY5qzO86Huf0OWal` | Agent configuration read back; voice quality unverified |
| TTS | `eleven_v4_turbo` | Agent configuration read back; Polish recognition/voice unverified |
| Authentication | `enable_auth: true`, empty allowlist | Actual private setting read back |
| Duration | 300 seconds | Actual provider setting read back; timing/teardown unverified |
| Capacity | 15 concurrent agent conversations, 100/day, bursting disabled | Actual agent settings read back; workspace quota/capacity unverified |
| Retention | Audio recording off; `retention_days: 1`, audio/transcript deletion flags enabled, zero retention disabled | Actual configuration read back; elapsed deletion behavior unverified |

The prompt accepts Polish observations/place names, asks about ambiguity and apartment/building/street scope, retains unknown time, requires fresh revision confirmation after correction and announces only a persisted reference. Emergency help is separate from demo reporting. Five dispatcher operations are allowed: `resolve_location`, `find_incidents`, `prepare_report`, `confirm_report_draft`, `submit_report`. No staff approval, execution, institution or MCP tool belongs to this agent.

Create and review those client tools before supplying their IDs to the configuration builder. Use `tool_ids`; inline `tools` is deprecated in the current official API schema. Every result-dependent client tool must set `expects_response: true` and `execution_mode: immediate`, with a bounded timeout, so the conversation waits for the authenticated API result. Keep model-supplied draft/identity authority out of adapters. Location choices must use returned candidates; they cannot invent coordinates. These adapters are not yet implemented in this preparation. [Client tool documentation](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools), [agent creation](https://elevenlabs.io/docs/eleven-agents/api-reference/agents/create).

Setup records the actual agent ID and immutable version in ignored configuration as `ELEVENLABS_AGENT_ID` and `ELEVENLABS_AGENT_VERSION_ID`. The checker verifies the exact prompt/resources, private authentication, capacity, five-minute duration and retention settings against that pin. The server provider adapter can request a WebRTC credential for that fixed agent/version via the [conversation-token API](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-webrtc-token); this capability has not been exercised and is not exposed through an application route until ownership/session limits are integrated. No API key reaches the browser. Attach reviewed authenticated client tools during final integration and explicitly repin the resulting version before enabling the session endpoint.

## Remaining integration

The current [React SDK guidance](https://elevenlabs.io/docs/eleven-agents/libraries/react) requires `ConversationProvider` around conversation hooks, a WebRTC conversation token, controlled mute and awaited `endSession`. The current registry version is `@elevenlabs/react` 1.16.0; pin that exact version when the browser hook lands. This provider-only preparation adds no SDK dependency or UI.

After #26 merges, reuse its owned draft ID/revision/submission identity and canonical authenticated APIs. Reserve a new voice-session migration against current main and pending PRs; migrations 001–007 are already taken. Enforce one active session per resident, five starts per ten minutes and five minutes per session before minting credentials. Verify provider-side duration/cleanup after an abruptly closed browser; a local lease expiry alone does not prove the provider stopped.

Stop SDK capture and all acquired microphone tracks on end, navigation, disconnect and form fallback. Keep transient transcript in memory only; persist structured draft observations through the existing intake service, never raw audio/full transcripts. Reconcile in-flight saves through the same draft before retrying. Missing configuration and microphone/provider failures retain the form.

Live acceptance still requires three actual outage conversations (ambiguous location, corrected building number, interruption), one committed reference each; denial/limits/disconnect before and after save; fresh confirmation after correction; ownership/origin and unavailable-config checks; real retention/configuration/conversation references, latency and cleanup evidence; Appica/keyboard/390/1440 px/both-theme review and application checks. Record evidence on #29 and #35, not inferred from this prepared adapter.
