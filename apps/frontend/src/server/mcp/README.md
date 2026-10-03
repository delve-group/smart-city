# Scoped MCP endpoint

Implemented and manually verified backend for [#34](https://github.com/delve-group/smart-city/issues/34). `POST /api/mcp` uses the pinned MCP TypeScript SDK's stateless Streamable HTTP transport with JSON responses. Every request creates and closes its own server and transport. No sessions, SSE subscriptions, resumability, browser-cookie authentication, OAuth discovery or dynamic client registration are implemented. Configure the endpoint and bearer manually in a trusted server-side client.

## Credentials and resource binding

Configuration is read lazily on MCP requests. Missing or invalid MCP settings return a safe `503` and do not prevent resident intake or app startup. A role can be disabled by leaving its token unset. Enabled tokens must be distinct and have an explicit shared expiry:

| Variable | Server-derived scope |
| --- | --- |
| `MCP_DECISION_TOKEN` | `system:decision_maker` |
| `MCP_ELECTRICITY_TOKEN` | Persisted `electricity` demo staff actor, only `demo-electricity` |
| `MCP_WATER_TOKEN` | Persisted `water` demo staff actor, only `demo-water` |
| `MCP_TOKEN_EXPIRES_AT` | ISO 8601 timestamp with offset; expired credentials receive `401` |

Generate three independent tokens using a cryptographic generator (at least 32 random bytes encoded as base64url). Accepted syntax is 43–128 base64url characters. Store them only in private ignored runtime configuration and the corresponding trusted MCP client. Do not reuse seed passwords, browser sessions, provider keys, or tokens from another deployment. No credentials are generated or committed by this module. Compose passes these optional variables only to the app container. Adding or changing them in the private runtime file requires recreating the app; no worker or provider key is involved.

Requests need `Authorization: Bearer <token>`. Token hashes are compared in constant time across every configured scope. Institution accounts and their fixed institution mapping are reread from PostgreSQL on every request; deleting or reassigning that actor revokes its access. There is no authority field in tool arguments. A credential cannot select an institution, become an official or switch tools via cookies.

`APP_ORIGIN` binds the canonical host and origin. Use exactly `${APP_ORIGIN}/api/mcp`, without query parameters. The reverse proxy must preserve the canonical `Host`; forwarded host headers are never trusted. An `Origin` header, when supplied, must equal `APP_ORIGIN`; absent Origin supports non-browser clients. There are no CORS allow headers. Production uses the foundation's HTTPS requirement. Requests for another resource/host are rejected before domain access.

For rotation, generate a replacement token privately, replace only that role's variable in the deployment environment, recreate the app container and update its authorized client. Extend `MCP_TOKEN_EXPIRES_AT` deliberately when needed. The previous token stops working once the app uses the replacement; no overlap or refresh token exists. Removing a role's token and recreating the app revokes that scope. An expired token is never renewed by a request.

## Tools

Tool lists depend on the authenticated credential. All inputs reject unknown properties, including nested objects. IDs, versions, text, locations, list sizes and pagination are bounded; ticket updates reuse the institution HTTP schema and domain service.

| Scope | Tool | Input |
| --- | --- | --- |
| Both | `search_tickets` | `{ q, mode?, limit?, category_id?: [], issue_type?: [], record_type?: [] }`; searches all three source kinds permitted to the caller despite the historical name |
| Both | `find_related_tickets` | `{ related_type, related_id, limit?, category_id?: [], issue_type?: [], record_type?: [] }`; authorized source lookup before stored-vector retrieval |
| Both | `get_search_record` | `{ record_type, record_id }`; exact current source lookup even during a provider outage |
| Decision-maker | `propose_action` | `{ incident_id, expected_incident_version, institution_id, explanation, evidence_ids }`; one incident-version proposal, never approval or execution |
| Decision-maker | `get_incident_context` | `{ incident_id }` |
| Decision-maker | `triage_report` | `{ report_id, expected_version, suggestion?: { incident_id?, rationale? } }` |
| Decision-maker | `resolve_responsibility` | `{ category_id, issue_type, location: { lat, lng } }` |
| Decision-maker | `get_service_observations` | `{ incident_id }`; reads the incident's authoritative scope, current fixture feed and stored observation evidence |
| Institution | `list_service_tickets` | `{ status?: [], limit?: 1..50, cursor?: string|null }`; defaults 20, discovers IDs from its own inbox |
| Institution | `get_service_ticket` | `{ ticket_id }` |
| Institution | `update_service_ticket` | `{ ticket_id, expected_version, status, note?, expected_resolution_at? }` |

Success has `structuredContent: { data, correlation_id }` and the same JSON in text content. Domain failures return `isError: true` with a safe code/message/correlation ID. Unexpected exceptions do not expose SQL, provider bodies or credentials. Read a record again after `version_conflict`; a disconnected write may have committed, so inspect current state before retrying. Tool descriptions/annotations are guidance; authority and state rules remain enforced by domain services.

Observation results explicitly separate current fixture readings from stored evidence. Only stored evidence IDs can be cited; a feed response does not create new evidence. Text in reports, notes and retrieved results is untrusted data, never an instruction or authorization. The decision-maker can trigger deterministic triage, but cannot override its eligibility or human changes.

`propose_action` reuses the strict domain suggestion schema while rejecting caller-supplied payload and assessment identity. The adapter derives `assess:incident:<lowercase UUID>:v<expected version>`; repeated calls recover the same proposal even after approval. The domain builds the exact payload, verifies current responsibility and 1–8 unique stored evidence IDs, rejects uncertain evidence, and protects existing human decisions. Provider mode does not grant authority: this manually configured decision-maker credential may propose independently of the optional automatic assessment worker. Search tools call the same `searchRecords` / `getSearchRecord` service as HTTP, then hydrate current authorized records from PostgreSQL. They never expose raw index candidates or impersonate an official session. The historical `search_tickets` and `find_related_tickets` names cover reports, incidents and service tickets; institutions can retrieve only assigned tickets. Source readers must explicitly authorize the decision-maker principal; unsupported projections remain absent until that domain handoff lands. Search result pages retain `ready` / `index_stale`, safe provider error codes and no cursor. Search projection versions are not command concurrency tokens: ticket projections combine their ticket and incident versions. Always call `get_service_ticket` for the version used by `update_service_ticket`. Query text is limited to 1,000 characters, result limits to 50 and filter lists to 20 (record types to three). Approval, reconciliation, execution, arbitrary URL fetches and raw connector calls are never exposed. Institution progress updates affect existing assigned tickets only and cannot create a ticket.

## Transport limits and manual verification

Clients send both `application/json` and `text/event-stream` in `Accept`, and `application/json` in `Content-Type`. Start with `initialize`; subsequent requests use the negotiated `MCP-Protocol-Version`. Do not send `MCP-Session-Id`. POST bodies are limited to 16 KiB and five seconds; batches are rejected. Results over 256 KiB return an explicit tool error. GET, DELETE and OPTIONS return `405` with `Allow: POST`. Every response is `no-store` with a generated correlation ID.

Manual cases for the integration run: missing/wrong/expired/duplicate token configuration; two institution credentials have separate inboxes and cannot read/update the other's ticket; decision-maker cannot list institution tools, approve or execute; malicious authority fields fail validation; stale ticket update changes nothing; deterministic triage preserves policy; invalid Origin/Host, oversized or slow body and batch fail; initialize, tool listing and domain calls survive repeated stateless requests; database errors remain safe. Do not print bearer values or cookies while recording results.

On 2026-10-03 a real SDK `Client` with `StreamableHTTPClientTransport` initialized and listed tools under each of the three scopes against the normal local app. Decision context and an Electricity ticket were read successfully. Anonymous requests returned 401 and a foreign Origin returned 403. Water could neither read nor update the Electricity ticket or read a private report. Unknown role/institution fields and injected proposal payload/decision fields were rejected; approval was absent from the decision tool list and could not be called. These calls preserved the existing single ticket. Three short-lived random credentials were supplied only to the acceptance process/container; the app was then recreated with its original configuration. No credential was recorded in Git or evidence.

This verifies the configured local transport and domain authorization. Production MCP credentials remain unset; deployed MCP access and OAuth compatibility are not claimed. Durable reasoning and stale/replay verification are recorded in the [assessment guide](../agents/README.md).

References: [MCP Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk).
