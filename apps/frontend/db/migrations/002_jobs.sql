CREATE TABLE work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('triage', 'index', 'execute')),
  source_type text NOT NULL CHECK (source_type IN ('report', 'incident', 'service_ticket', 'action_proposal')),
  source_id text NOT NULL CHECK (length(source_id) BETWEEN 1 AND 200),
  source_version integer NOT NULL CHECK (source_version > 0),
  idempotency_key text NOT NULL UNIQUE CHECK (length(idempotency_key) BETWEEN 1 AND 300),
  payload jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(payload) = 'object' AND octet_length(payload::text) <= 2048),
  correlation_id text NOT NULL CHECK (length(correlation_id) BETWEEN 1 AND 200),
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'running', 'parked', 'done', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  retries integer NOT NULL DEFAULT 0 CHECK (retries BETWEEN 0 AND 2),
  available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_token uuid,
  lease_owner uuid,
  lease_expires_at timestamptz,
  detail text CHECK (length(detail) <= 300),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz,
  CHECK (
    (state = 'running' AND lease_token IS NOT NULL AND lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR (state <> 'running' AND lease_token IS NULL AND lease_owner IS NULL AND lease_expires_at IS NULL)
  ),
  CHECK ((state IN ('done', 'failed')) = (finished_at IS NOT NULL)),
  CHECK (
    (kind = 'triage' AND source_type = 'report')
    OR (kind = 'index' AND source_type IN ('report', 'incident', 'service_ticket'))
    OR (kind = 'execute' AND source_type = 'action_proposal')
  )
);

CREATE INDEX work_items_due_idx ON work_items (available_at, created_at, id) WHERE state IN ('queued', 'parked');
CREATE INDEX work_items_expired_idx ON work_items (lease_expires_at) WHERE state = 'running';
CREATE INDEX work_items_source_idx ON work_items (source_type, source_id, source_version DESC);
CREATE UNIQUE INDEX work_items_one_running_source_idx ON work_items (source_type, source_id) WHERE state = 'running';

CREATE TABLE work_attempts (
  lease_token uuid PRIMARY KEY,
  work_id uuid NOT NULL REFERENCES work_items(id),
  attempt integer NOT NULL CHECK (attempt > 0),
  worker_id uuid NOT NULL,
  outcome text NOT NULL DEFAULT 'running' CHECK (outcome IN ('running', 'done', 'retry', 'failed', 'parked', 'abandoned')),
  detail text CHECK (length(detail) <= 300),
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz,
  CHECK ((outcome = 'running') = (finished_at IS NULL))
);
CREATE INDEX work_attempts_work_idx ON work_attempts (work_id, started_at);

CREATE TABLE work_worker_heartbeat (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  worker_id uuid NOT NULL,
  heartbeat_at timestamptz NOT NULL,
  started_at timestamptz NOT NULL,
  registered_kinds text[] NOT NULL
);
