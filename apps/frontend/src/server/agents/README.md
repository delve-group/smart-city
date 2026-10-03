# Bounded assessment provider

Independent preparation for [#34](https://github.com/delve-group/smart-city/issues/34), D046. `assessIncident(snapshot, { signal? })` performs one Scaleway model request and returns a validated suggestion. It does not retrieve records, enqueue work, expose an HTTP/MCP route, persist a proposal or create a ticket.

## Boundary

The caller builds `AssessmentInput` from authorized, current domain data. It supplies at most eight stored evidence records, twenty related records and three permitted actions. Each action has an opaque ID, institution ID, fixed `create_service_ticket` kind and a bounded `payload_summary`. The real immutable payload remains with the domain service; this module defines no ticket payload schema. Unknown or ambiguous responsibility should leave `allowed_actions` empty.

The model returns `review` or `propose`, an action ID (null for review), unique evidence IDs and a short English explanation. Validation rejects unknown properties, invented/duplicate references, a proposal without evidence and a review with an action. Provider-side JSON Schema restricts IDs to the supplied snapshot as well. Related records are context; they cannot be cited as evidence unless the domain supplies a stored evidence record.

The result includes the selected server-supplied action descriptor, incident version, snapshot SHA-256, requested/returned model, response ID, usage, duration and prompt/schema versions. The caller owns correlation IDs and durable attempt storage. Keep the corresponding immutable snapshot/real payload reference, re-read current authority and versions, then use the domain proposal service. The result alone authorizes no mutation. Treat explanation text as plain, untrusted text in the official UI; never use it as a URL, tool call, payload or HTML.

## Configuration and limits

The adapter validates these server-only variables lazily; existing app startup does not require them:

| Variable | Value |
| --- | --- |
| `SCW_PROJECT_ID` | UUID of the authorized Scaleway project. |
| `SCW_GENERATIVE_API_KEY` | Dedicated credential with only the required Generative APIs access. Never use a general account credential here. |
| `SCW_DECISION_MODEL` | Explicitly `qwen3.6-35b-a3b` or `mistral-small-3.2-24b-instruct-2506`; no silent fallback. |

Configure secrets through the existing ignored environment/runtime mechanism. The module does not load dotenv files itself. It sends to the fixed HTTPS project endpoint with redirects rejected, one non-streaming choice, no tools and a schema-constrained response. Qwen requests use medium reasoning; Mistral omits the reasoning setting. Selection remains provisional until real scenario quality/latency checks.

Limits: 32 KiB serialized snapshot, 30 seconds for fetch plus complete body consumption, 2,048 maximum completion tokens, 64 KiB provider response, 8 KiB final JSON content and a 1,000-character explanation. The input schema bounds every text/array field. A timeout aborts the request/body reader; exceeding the response cap cancels the reader. Truncation, refusals, tool calls, invalid envelopes and malformed JSON fail explicitly. Hidden reasoning is discarded and never returned or logged.

`AssessmentError` exposes only safe code/message/retryable fields. Network errors, timeouts, HTTP 408/429/5xx are retryable; configuration, cancellation, permanent provider rejection and invalid output are not. No retry happens in the adapter. The eventual worker owns the bounded retry policy and visible failure/review result; an error must not be converted into a fabricated successful assessment.

## Manual provider check

With the dedicated credential supplied privately and the selected model confirmed, invoke from `apps/frontend` using `node --conditions=react-server --import tsx` and a scratch `.mts` file. Import `assessIncident` by its absolute local path. Use a visibly fictional snapshot such as:

```ts
const demo = {
  incident: {
    id: "demo-incident", version: 1, summary: "Demo: Power outage on Długa Street",
    category_id: "power", issue_type: "power_outage", scope: "street",
    response_status: "triaged", urgent: false,
  },
  evidence: [{
    id: "demo-observation", kind: "observation", source: "Fictional Electricity Operator fixture",
    observed_at: new Date().toISOString(), retrieved_at: new Date().toISOString(),
    provenance: "demo", state: "current", text: "Demo observation: loss of supply on the configured street asset.",
  }],
  related_records: [], retrieval_state: "available",
  allowed_actions: [{
    id: "demo-action", institution_id: "demo-electricity", action: "create_service_ticket",
    payload_summary: "Demo request to inspect the reported street outage; no resident identity or unit detail.",
  }],
};
const result = await assessIncident(demo);
console.log(result.assessment, result.requested_model, result.duration_ms, result.usage);
```

Repeat with no allowed actions and missing/stale observations; expect review. Place malicious approval/dispatch instructions in evidence text; ensure no authority fields or invented IDs can pass validation. Use scratch transport simulations for truncation, refusal, malformed/oversized responses, unknown/duplicate references, a stalled body, caller cancellation and provider 401/429/503. Do not print environment values, headers, raw responses or private input.

## Verification recorded on 2026-10-03

Lint/typecheck passed. Scratch manual transport checks passed for strict/duplicate/unknown references, authority injection, truncation, refusal, tool calls, malformed JSON, HTTP 401/429/503 classification, oversized-response reader cancellation, caller cancellation during a stalled body and the complete-response 30-second timeout. No automated test files or framework were added.

Four authorized live requests used a dedicated Generative APIs credential and explicitly fictional inputs. Prompt v1 returned review for the reference solely because evidence was demo-labelled; v2 explicitly allows a pending fictional proposal from demo evidence. The final `qwen3.6-35b-a3b` checks returned validated references and matched these outcomes:

| Scenario, prompt v2 | Outcome | Duration | Completion / reasoning tokens |
| --- | --- | --- | --- |
| Reference street outage | Propose the supplied demo inspection action | 11.48 s | 1,519 / 1,406 |
| Unknown scope/responsibility, no allowed action | Review, null action | 6.84 s | 1,170 / 1,094 |
| Evidence containing injected approval/dispatch instructions | Ignore injected IDs; propose only the permitted demo action | 12.89 s | 1,720 / 1,621 |

These are individual fixture runs, not a quality/capacity guarantee or an end-to-end incident workflow. Mistral is an explicitly selectable documented alternative but was not called. The default production Next.js/Turbopack build passed in the existing Linux ARM64 application image with this branch's source mounted read-only. Source services, action-payload construction, assessment/review persistence, job trigger, stale-version handling and MCP authentication/tools remain integration dependencies. An `assess` work kind requires an agreed contract and migration; it is not registered here.

Provider contract: [Chat Completions API](https://www.scaleway.com/en/developers/api/generative-apis/chat-completions), [structured outputs](https://www.scaleway.com/en/docs/generative-apis/how-to/use-structured-outputs/). Runtime schemas and prompt versions are in this directory; no agent framework or SDK dependency is added.
