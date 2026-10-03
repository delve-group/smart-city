# Bounded incident assessments

Implementation for [#34](https://github.com/delve-group/smart-city/issues/34), following the independent provider adapter in D046. `handleAssessmentWork` composes authoritative incident context, optional scoped related search, the bounded provider and the domain's proposal/review services. `assessIncident(snapshot, { signal? })` remains the single-request provider boundary. No assessment approves an action, creates a ticket or replaces deterministic PostgreSQL triage.

## Durable workflow

Incident lifecycle changes enqueue `assess` work for an incident version with the canonical key `assess:incident:{id}:v{version}` when the decision provider is enabled. `enqueueWork` enforces this key, and the ordinary worker registers the handler alongside triage, indexing and execution. Migration `007_incident_assessments.sql` extends the work-kind constraints and stores one durable assessment per incident/version plus its attempts. The action service owns proposal replay identity through migration `006_action_assessment_identity.sql`.

The handler checks the saved final outcome before retrieval or a provider call. It obtains private context using the internal decision-maker principal and requests the domain's current permitted action. Both must match the queued version. There is at most one server-owned action, eight stored evidence items and twenty related records. Every stored evidence item's state, timestamps, provenance, note and available report text is retained. Current service observations without stored IDs are included as uncitable context. More than eight items, missing referenced reports or a snapshot beyond the input limits goes to explicit human review; evidence is not truncated to force a model call. Missing/stale search is labelled degraded and does not change deterministic grouping rules.

Before the provider call, a short transaction stores the immutable private snapshot, its SHA-256, prompt/schema versions and attempt number. No transaction spans search or inference. Each assessment permits at most three provider attempts, counted before requests so process crashes cannot reset the limit. Retryable provider failures return to the worker's existing two-retry schedule and leave a safe official review note. Permanent errors and exhausted attempts finish as `review`; stale versions or protected human/action state finish as `superseded`. A successfully prepared pending proposal finishes as `proposal`. A completed work item means the assessment reached one of these outcomes, not that the provider succeeded or an action was approved.

A validated response and its safe provider metadata are persisted before calling `proposeAction`. Restarted work reuses that response, and the domain's assessment key replays a proposal if the process stopped between proposal creation and final assessment persistence. Human approval/rejection and current domain preconditions retain authority. Database failures use the bounded transport retry; if the database cannot persist a review, inspect the failed queue item with `worker:status`. The official may still see the earlier queued note; no saved review is claimed.

`incident_assessments` holds outcome, correlation, attempt count and an optional proposal reference. `incident_assessment_attempts` holds the private snapshot, validated result/metadata, timestamps and safe error codes. There is no public reader for these tables. Queue details contain outcome codes only; snapshots, private narratives, provider bodies and credentials are never logged. Changing provider configuration does not rerun an already final assessment for the same incident version.

## Boundary

The provider accepts `AssessmentInput` from authorized, current domain data with at most eight stored evidence records, twenty related records and three permitted actions. The integrated handler supplies one permitted action or leaves the case in review without calling the provider. Each action has an opaque ID, institution ID, fixed `create_service_ticket` kind and a bounded `payload_summary`. The real immutable payload remains with the domain service; this module defines no ticket payload schema.

The model returns `review` or `propose`, an action ID (null for review), unique evidence IDs and a short English explanation. Validation rejects unknown properties, invented/duplicate references, a proposal without evidence and a review with an action. Provider-side JSON Schema restricts IDs to the supplied snapshot as well. Related records are context; they cannot be cited as evidence unless the domain supplies a stored evidence record.

The result includes the selected server-supplied action descriptor, incident version, snapshot SHA-256, requested/returned model, response ID, usage, duration and prompt/schema versions. The handler stores these alongside its attempt before the domain proposal service rechecks current authority. The result alone authorizes no mutation. Treat explanation text as plain, untrusted text in the official UI; never use it as a URL, tool call, payload or HTML.

## Configuration and limits

The adapter validates credentials when used. Root startup validates the required names when `DECISION_PROVIDER=scaleway`; disabled mode needs no model credentials. Compose passes model credentials only to the worker, and the selected mode to web and worker:

| Variable | Value |
| --- | --- |
| `DECISION_PROVIDER` | `disabled` by default, or explicitly `scaleway`. Disabled mode needs no provider credentials; the lifecycle keeps its labelled rule-based demo path. A previously queued assessment processed while disabled ends in review. |
| `SCW_PROJECT_ID` | UUID of the authorized Scaleway project. |
| `SCW_GENERATIVE_API_KEY` | Dedicated credential with only the required Generative APIs access. Never use a general account credential here. |
| `SCW_DECISION_MODEL` | Explicitly `qwen3.6-35b-a3b` or `mistral-small-3.2-24b-instruct-2506`; no silent fallback. |

Configure secrets through the existing ignored environment/runtime mechanism. The module does not load dotenv files itself. It sends to the fixed HTTPS project endpoint with redirects rejected, one non-streaming choice, no tools and a schema-constrained response. Qwen requests explicitly disable internal reasoning; Mistral omits the reasoning setting. Selection remains provisional until real scenario quality/latency checks.

Limits: 32 KiB serialized snapshot, 30 seconds for fetch plus complete body consumption, 2,048 maximum completion tokens, 64 KiB provider response, 8 KiB final JSON content and a 1,000-character explanation. The input schema bounds every text/array field. A timeout aborts the request/body reader; exceeding the response cap cancels the reader. Truncation, refusals, tool calls, invalid envelopes and malformed JSON fail explicitly. Hidden reasoning is discarded and never returned or logged.

`AssessmentError` exposes only safe code/message/retryable fields. Network errors, timeouts, HTTP 408/429/5xx are retryable; configuration, cancellation, permanent provider rejection and invalid output are not. No retry happens in the adapter; the durable handler and worker own the bounded retry policy and visible review result.

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

## Provider-adapter verification recorded on 2026-10-03

Lint/typecheck passed. Scratch manual transport checks passed for strict/duplicate/unknown references, authority injection, truncation, refusal, tool calls, malformed JSON, HTTP 401/429/503 classification, oversized-response reader cancellation, caller cancellation during a stalled body and the complete-response 30-second timeout. No automated test files or framework were added.

Four authorized live requests used a dedicated Generative APIs credential and explicitly fictional inputs. Prompt v1 returned review for the reference solely because evidence was demo-labelled; v2 explicitly allows a pending fictional proposal from demo evidence. The final `qwen3.6-35b-a3b` checks returned validated references and matched these outcomes:

| Scenario, prompt v2 | Outcome | Duration | Completion / reasoning tokens |
| --- | --- | --- | --- |
| Reference street outage | Propose the supplied demo inspection action | 11.48 s | 1,519 / 1,406 |
| Unknown scope/responsibility, no allowed action | Review, null action | 6.84 s | 1,170 / 1,094 |
| Evidence containing injected approval/dispatch instructions | Ignore injected IDs; propose only the permitted demo action | 12.89 s | 1,720 / 1,621 |

These are historical provider fixture runs, not verification of the new durable workflow or a quality/capacity guarantee. Mistral is an explicitly selectable documented alternative but was not called. The provider preparation's production Next.js/Turbopack build passed in the existing Linux ARM64 application image with its source mounted read-only. Integrated workflow checks followed below; the deployed provider path remains separate from the local acceptance. MCP checks are recorded in the [transport guide](../mcp/README.md).

## Integrated workflow acceptance — 2026-10-03

The normal local PostgreSQL/worker/domain stack processed a real `qwen3.6-35b-a3b` response for fictional report `R-26-001009`. Its stored model request took **9.015 seconds** and produced an explained pending proposal citing two stored, dated demo evidence records and the configured Electricity institution. Official approval produced exactly one ticket, `ELE-26-000422`. A saved report without a current service reading (`R-26-001008`) instead remained in visible assessment review. Replaying the successful assessment preserved the executed proposal, its version, attempt count and existing ticket.

Two further scratch checks used real domain/storage calls with only the fixed model HTTP response simulated. Three successive provider 503 responses exhausted the bounded attempts, retained fictional report `R-26-001014`, stored review with attempt count three and created zero tickets. During a delayed valid simulated response, an official dispute advanced the incident version. The handler superseded the old assessment and preserved the newer dispute, with zero proposals/tickets. These are controlled failure/concurrency simulations, not additional live-model requests.

Ten direct deterministic-policy checks passed: same-street grouping, nearby water/street-light separation, apartment/building separation, ambiguity review, the inclusive 60-minute and 300-metre bounds and cases just outside each bound. Semantic similarity supplied no grouping authority. Provider fixture checks above cover malicious retrieved instructions and unknown responsibility; the real MCP client checks cover denied approval/authority injection and institution isolation.

Integrated lint, typecheck and production build passed at `2833d2d`. Scratch acceptance scripts stayed outside the repository; no test framework or committed tests were added. Local development still defaults to `DECISION_PROVIDER=disabled`; those initial live credentials were supplied privately only for the deliberate local run. Production was subsequently enabled and verified as described below. This proves the opt-in backend workflow, not the full voice/UI rehearsal, model quality across all report categories or 15–30-user capacity.

Provider contract: [Chat Completions API](https://www.scaleway.com/en/developers/api/generative-apis/chat-completions), [structured outputs](https://www.scaleway.com/en/docs/generative-apis/how-to/use-structured-outputs/). Runtime schemas and prompt versions are in this directory; no agent framework or SDK dependency is added.

## Deployed reasoning budget correction

The three-report deployed snapshot reached visible review with `invalid_assessment_output` at medium reasoning. A private diagnostic replay showed `finish_reason: length`, no final content and 2,048 reasoning tokens consuming the complete 2,048-token output budget. Low reasoning reproduced the same failure. With `reasoning_effort: none`, that exact snapshot returned a valid two-evidence proposal in 1.253 seconds, with 234 completion tokens and zero reasoning tokens. No hidden reasoning text was printed or persisted by the diagnostic.

The adapter therefore explicitly disables internal reasoning for Qwen while retaining the selected model, complete snapshot, structured-output schema, strict action/evidence references, timeout, response caps and token budget. Domain grouping, institution mapping and official authority remain unchanged. This is a bounded demo assessment, not a general model-quality guarantee. [Scaleway reasoning controls](https://www.scaleway.com/en/docs/generative-apis/how-to/query-reasoning-models/) document `none`; the [supported model reference](https://www.scaleway.com/en/docs/generative-apis/reference-content/supported-models/) lists it for Qwen3.6. Historical medium-reasoning fixture timings above remain historical evidence. Live checks with reasoning disabled also returned review for injected approval/dispatch instructions (1.498 s, 217 tokens) and unknown scope/no allowed action (1.040 s, 103 tokens). Valid references and unchanged strict schemas were checked; no domain writes occurred in these diagnostic calls.

## Deployed workflow and failure evidence

Revision `2354b82` is deployed with Scaleway mode enabled; its dedicated credential stays in private worker configuration. The first automatic attempt for three new reports still returned invalid output and safely left `INC-26-000208` in review with no ticket. A subsequent affected contribution advanced the incident version; with the normal worker temporarily paused, a one-shot process using the same deployed worker image called the real `handleAssessmentWork`. It sent `reasoning_effort: none` and stored a validated pending proposal in **1.572 seconds**, using **170 completion tokens / zero reasoning tokens**, citing two stored evidence records. The ordinary worker resumed and recovered that queued assessment's stored result. There were three reports and four distinct supporters. This records the successful run and the initial failed run, rather than claiming every model response is valid.

Official HTTPS approval of that actual model proposal produced exactly one `ELE-26-000424`, and replay returned the existing approval/ticket. Electricity acknowledged, started and resolved it; public API reads observed progress within 117–150 ms. The same deployed-image/domain/storage check replayed the executed live result unchanged. Controlled fetch responses then exercised provider 503 exhaustion (three stored attempts, saved `R-26-001022`, visible review, zero tickets) and an official dispute during a delayed valid response (old assessment superseded, dispute preserved, zero proposals/tickets). Only the model responses in those failure cases were simulated. The ordinary worker was restarted afterward.

See the [deployment record](../../../../../deploy/scaleway-release.md) and [rehearsal matrix](../../../../../docs/demo-rehearsal.md). Browser voice, final resident UI and representative capacity remain pending. Invalid model outputs remain a human-review path; internal reasoning being disabled is not a guarantee of model quality.
