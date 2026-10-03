-- Durable decision-maker work. Existing triage and execution contracts stay unchanged.
ALTER TABLE work_items DROP CONSTRAINT work_items_kind_check;
ALTER TABLE work_items ADD CONSTRAINT work_items_kind_check
  CHECK (kind IN ('triage', 'index', 'execute', 'assess'));
ALTER TABLE work_items DROP CONSTRAINT work_items_check2;
ALTER TABLE work_items ADD CONSTRAINT work_items_kind_source_check CHECK (
  (kind = 'triage' AND source_type = 'report')
  OR (kind = 'index' AND source_type IN ('report', 'incident', 'service_ticket'))
  OR (kind = 'execute' AND source_type = 'action_proposal')
  OR (kind = 'assess' AND source_type = 'incident')
);

CREATE TABLE incident_assessments (
  assessment_key text PRIMARY KEY CHECK (length(assessment_key) <= 300),
  incident_id uuid NOT NULL,
  incident_version integer NOT NULL CHECK (incident_version > 0),
  correlation_id text NOT NULL CHECK (length(correlation_id) BETWEEN 1 AND 200),
  provider text CHECK (provider IN ('disabled', 'scaleway')),
  state text NOT NULL DEFAULT 'running' CHECK (state IN ('running', 'review', 'proposal', 'superseded')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 3),
  detail text CHECK (length(detail) <= 200),
  proposal_id uuid REFERENCES action_proposals(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  UNIQUE (incident_id, incident_version),
  CHECK (assessment_key = 'assess:incident:' || incident_id::text || ':v' || incident_version::text),
  CHECK ((state <> 'running') = (finished_at IS NOT NULL)),
  CHECK ((state = 'proposal') = (proposal_id IS NOT NULL))
);

-- Private authorized snapshots; never expose these through public processing status.
CREATE TABLE incident_assessment_attempts (
  assessment_key text NOT NULL REFERENCES incident_assessments(assessment_key),
  attempt integer NOT NULL CHECK (attempt BETWEEN 1 AND 3),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object' AND octet_length(snapshot::text) <= 40000),
  snapshot_sha256 text NOT NULL CHECK (snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  prompt_version text NOT NULL CHECK (length(prompt_version) BETWEEN 1 AND 100),
  schema_version text NOT NULL CHECK (length(schema_version) BETWEEN 1 AND 100),
  outcome text NOT NULL DEFAULT 'running'
    CHECK (outcome IN ('running', 'received', 'retry', 'failed', 'abandoned', 'review', 'proposal', 'superseded')),
  result jsonb CHECK (jsonb_typeof(result) = 'object' AND octet_length(result::text) <= 20000),
  error_code text CHECK (length(error_code) <= 200),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  PRIMARY KEY (assessment_key, attempt),
  CHECK ((outcome <> 'running') = (finished_at IS NOT NULL))
);
