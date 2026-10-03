# Report classification and responsibility routing

## Scope

Implement the first two requested steps: identify one city problem from its resident
observation and route it using our configured institution directory. Internet discovery
and semantic report grouping are outside this slice. Provider use follows the existing
`DECISION_PROVIDER=scaleway` setting; disabled installations keep their submitted classification.

## Design

Reuse the existing bounded Scaleway structured-output transport rather than adding a
provider or another job type. The durable triage handler reads the saved report, asks for
one category/issue pair from the current catalog, and validates the pair locally. The
observation remains private and unchanged. A clear AI classification replaces the
submitted category/issue within the triage transaction; the original pair and model
metadata are recorded in the private triage policy. Any official classification takes precedence over subsequent model classification.
The report version is rechecked
after the model call, and the category/issue lock uses the resulting classification.
The provider call holds no database lock. Urgency, scope and timestamps remain resident facts.

The server's existing responsibility resolver maps the resulting issue and service area
to institutions. AI does not invent an institution or establish infrastructure ownership.
Extend the fictional directory to cover specific issues, including blocked drains and
sewers. New entries are installed by an additive migration 010 for existing deployments.
Institution inbox accounts remain the existing electricity and water accounts.

Migration 010 also requeues unlinked, non-urgent, non-unit reports whose review note
exactly identifies the retired power-only gate. It increments their versions and commits
audit plus triage/index work together. Other review items and existing links are preserved.

Complete non-power reports may start a separate incident when no nearby candidate
exists. A nearby candidate still requires a human linking decision; power outages keep
their existing deterministic linking rules. Unknown scope/time/location, private units,
urgency, ambiguous classifications and provider failures remain visible for review.
Multiple or absent responsibility rules require an official's selection. Ticket proposals
continue through the existing official approval and demo connector; classification does
not contact a real institution.

## Alternatives considered

1. Extend voice instructions alone: quick, but misses form reports and does not unblock routing.
2. Classify saved reports in durable triage (selected): covers both intake channels and reuses
   version checks, audit, indexing, responsibility and proposal approval.
3. Add semantic grouping now: useful later, but expands beyond the two requested decisions.

## Verification

Run lint, typecheck and build. Manually exercise real-provider Polish observations,
misclassification correction, sewer routing, unclear observations, model failure,
private/urgent precedence and non-power candidate review. Verify transaction replay and
version conflicts with disposable database records. No automated tests are introduced.

## Observed verification

- Live Scaleway Qwen classified Polish sewer, lift and pothole descriptions despite
  an initial power classification; vague text went to review and an injected category
  instruction was ignored. Five initial calls took 963–2,064 ms.
- Disposable PostgreSQL: corrected sewer classification and `demo-water` assignment
  committed together; replay and stale versions before/during the provider call were
  superseded. Concurrent non-power intake created one incident and one review item.
  A three-day-old same-type nearby candidate still required review.
- Private scope, urgency, missing provider configuration and unclear descriptions
  remained reviewable. Seven category/issue directory lookups each returned one institution.
- The shared incident-assessment transport returned a valid real-model electricity
  proposal without a domain write. The sewer incident's assessment required review
  because the existing fictional service observation is missing; routing was established,
  but no ticket was approved or executed during verification.
- Migration 010 applied on fresh and existing disposable databases. Only the old-gate
  report was requeued with two jobs and one audit event; custom human review, urgent
  and private reports stayed unchanged. Repeating the SQL created no extra version.
- Operator UI showed Water Service selected for the sewer case. Desktop and 390-pixel
  views displayed the panel and category correctly; keyboard focus reached its controls.
- Production deployment, a fresh microphone session and elapsed provider timeout were
  not exercised. No automated tests were added.
