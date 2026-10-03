# Durable work

The PostgreSQL transport implements [workflow contract section 8](../../../../../docs/workflow-contracts.md#8-transactional-work-interface). Migration `002_jobs.sql` creates work, attempt and heartbeat tables without domain-table foreign keys. `npm run dev` and `npm start` at the repository root start one supervised worker with the existing application and database. Migration/seed setup must succeed before the worker starts. Application availability does not depend on a running worker: intake can commit pending work during a worker or provider outage.

## Domain integration

Import `enqueueWork`, `registerWorkHandler`, `WorkItem`, `WorkResult` and `getSourceWorkStatus` from `@/server/jobs`. The enqueue function accepts the caller's `PoolClient`; it never starts or commits a transaction or calls a provider. Commit a source mutation and its work together:

```ts
await client.query("BEGIN");
try {
  // Insert/update the source using this client, then use the resulting identity.
  await enqueueWork(client, {
    kind: "triage",
    source: { type: "report", id: report.id, version: report.version },
    idempotency_key: `triage:report:${report.id}:v${report.version}`,
    correlation_id,
  });
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
}
```

The globally unique key returns the existing work ID on an identical replay, including after completion; changed kind, source, version or payload produces `WorkInputError` with code `idempotency_conflict` and status 409. A new correlation ID alone does not change replay identity. Validation failures have code `invalid_request` and status 400. Domain adapters map these safe errors to their usual error envelope. Roll back the entire source transaction on any enqueue error.

Payloads are optional flat scalar metadata, bounded to 2 KB in stored JSONB form. Use IDs and flags only: never credentials, narratives or personal data. Version must be a positive PostgreSQL integer. Supported kind/source pairs and key templates remain defined by the workflow contract.

Register real handlers in `handlers.ts`, the worker's composition entry point. One handler is allowed per kind. There are deliberately no default success handlers. Each handler re-reads and authorizes/revalidates its domain source, opens its own short transactions, and makes provider calls outside those transactions. It must return a `WorkResult` with a safe detail/reason of at most 300 characters; never return raw provider errors or personal data. Thrown errors and malformed results become safe terminal failures (`handler_error`, `invalid_handler_result`). Return `retry` explicitly for known transient failures. Bound all external requests with timeouts.

The jobs module owns delivery only. Triage, approval validation, ticket execution and current-source indexing stay with their respective domain handlers. Delivery is **at least once**: a process can die after a domain write/provider effect and before queue completion. Handlers must reconcile source versions and use the domain/connector idempotency keys before repeating effects. A queue lease is not business authorization or an exactly-once guarantee.

After authorizing a source, call `getSourceWorkStatus(client, { type, id })` to obtain its latest work per kind plus the contract's `processing` state. It exposes pending, retrying and failed work without payloads. A parked item maps to `queued` with its reason; a terminal failure maps to `failed`. Domains own their public DTO mapping and any current-source/index-stale presentation. This reader grants no source access by itself.

## Ownership and recovery

- One dedicated PostgreSQL session holds an advisory lock for the worker's lifetime. A second worker exits with `worker_already_running`. One sequential dispatcher runs handlers; a partial unique index also prohibits concurrent running work for the same source type/ID across kinds and versions.
- Each claim increments attempts, records an attempt row and gets a fresh lease token. Heartbeats extend only a current, unexpired token. Completion must match the current unexpired token. An expired lease becomes an `abandoned` attempt and is reclaimed with a new token; the old token cannot complete or renew it.
- A handler may request two transient retries, delayed by 2 and 10 seconds. A third `retry` result is terminal `failed` with `retry_limit`. Crashed/expired attempts remain in history but do not consume the handler's transient dependency retry budget.
- An unregistered kind becomes `parked` with `handler_unavailable`, without creating an attempt or consuming retries. Registering that handler and restarting the worker makes it immediately eligible. A handler's own `parked` result records that outcome, subtracts its counted attempt, and waits 30 seconds before checking again.
- PostgreSQL supplies all scheduling and lease timestamps. No queue transaction remains open while a handler runs. A database/session/lease failure terminates the CLI; Compose restarts it. The old process does not reconnect and continue an in-flight handler with lost ownership.
- SIGINT/SIGTERM stops claiming and allows the current handler to finish while heartbeats continue. A 30-second shutdown deadline terminates unfinished work, which remains reclaimable after its lease expires. Compose allows 35 seconds for this shutdown. Graceful shutdown removes only this worker's heartbeat and closes its advisory-lock session.

## Operations

From `apps/frontend`, use `npm run worker`, `npm run worker:health` (exit status only when healthy), or `npm run worker:status` (safe JSON heartbeat, registered kinds and queue counts). The worker script supplies Node's `react-server` condition so the existing `server-only` database guard works outside Next. Keep these script flags when running under another supervisor.

For the root Compose stack:

```sh
docker compose logs --tail 100 worker
docker compose exec worker npm run worker:status
docker compose restart worker
```

The development overlay mounts source and scripts; restart the worker after handler/code changes. It does not run a watcher. Health measures a current database heartbeat, independently of whether all handlers are installed. A healthy worker with parked work is useful during incremental domain delivery; inspect `registered_kinds`, queue counts and source processing detail to distinguish that from an outage. `handler_result` in attempt logs is the handler's requested result; the database and source status show the final state after retry-limit enforcement.

The worker uses the existing `DATABASE_URL` or PostgreSQL connection fields and `APP_ORIGIN`. Production still requires an HTTPS origin. It does not need seed passwords, LLM or search credentials. Optional settings are passed by Compose:

| Variable | Default | Accepted values |
| --- | --- | --- |
| `WORKER_POLL_MS` | 1000 | Integer 100–30000 |
| `WORKER_LEASE_MS` | 30000 | Integer 3000–300000 |
| `WORKER_HEARTBEAT_MS` | 5000 | Integer 250–10000; strictly below one third of the lease |

Health becomes stale after three heartbeat intervals. Invalid settings report variable names without printing values. Missing migrations, database outages and duplicate workers exit unsuccessfully with actionable messages. Logs contain work/correlation IDs and safe outcome labels, never work payloads or raw exception messages. Do not delete failed records or reset completed idempotency keys to retry effects; recovery/reconciliation belongs to the domain workflow.
