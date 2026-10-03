-- Action proposals, official decisions, execution state and institution service tickets.

CREATE SEQUENCE service_ticket_reference_seq START 421;

CREATE TABLE action_proposals (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id),
  -- Ordinal within the incident: the "proposal version" an official approves.
  version integer NOT NULL CHECK (version > 0),
  incident_version integer NOT NULL,
  institution_id text NOT NULL REFERENCES institutions(id),
  action text NOT NULL CHECK (action = 'create_service_ticket'),
  payload jsonb NOT NULL,
  evidence_ids uuid[] NOT NULL DEFAULT '{}',
  explanation text NOT NULL,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'approved', 'rejected', 'executing', 'executed', 'failed', 'unknown', 'superseded')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES actors(id),
  decided_at timestamptz,
  decision_reason text,
  approved_incident_version integer,
  execution_key text NOT NULL UNIQUE,
  execution_attempts integer NOT NULL DEFAULT 0,
  execution_error text,
  executed_at timestamptz,
  UNIQUE (incident_id, version)
);

-- At most one proposal per incident can be waiting for a decision or an execution outcome.
CREATE UNIQUE INDEX action_proposals_open_idx ON action_proposals(incident_id)
  WHERE state IN ('pending', 'approved', 'executing', 'unknown');

CREATE TABLE service_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  incident_id uuid NOT NULL REFERENCES incidents(id),
  -- One ticket per approved proposal, whatever is retried.
  proposal_id uuid NOT NULL UNIQUE REFERENCES action_proposals(id),
  institution_id text NOT NULL REFERENCES institutions(id),
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'acknowledged', 'in_progress', 'resolved', 'rejected')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  expected_resolution_at timestamptz,
  result_note text,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- At most one ticket per incident that an institution is still working on.
CREATE UNIQUE INDEX service_tickets_active_idx ON service_tickets(incident_id)
  WHERE status IN ('created', 'acknowledged', 'in_progress');
CREATE INDEX service_tickets_institution_idx ON service_tickets(institution_id, updated_at DESC);

CREATE TABLE service_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES service_tickets(id),
  status text NOT NULL,
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX service_ticket_events_ticket_idx ON service_ticket_events(ticket_id, occurred_at);

-- DEMO CONNECTOR. Stands in for a fictional institution's intake system: it records each
-- request by execution key, so a repeated or uncertain send can be looked up instead of resent.
CREATE TABLE demo_connector_requests (
  execution_key text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id),
  external_reference text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Manual rehearsal aid: makes the next sends to an institution fail or time out.
CREATE TABLE demo_connector_faults (
  id serial PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id),
  mode text NOT NULL CHECK (mode IN ('fail', 'timeout_before', 'timeout_after')),
  remaining integer NOT NULL CHECK (remaining >= 0)
);
