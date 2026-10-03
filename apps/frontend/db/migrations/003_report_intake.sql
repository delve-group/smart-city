-- Resident intake: owned drafts, committed reports and the shared audit log.
-- reports.incident_id gains its foreign key with the incident tables.

CREATE SEQUENCE report_reference_seq START 1001;

CREATE TABLE report_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  submission_key uuid NOT NULL DEFAULT gen_random_uuid(),
  fields jsonb NOT NULL,
  confirmed_revision integer,
  confirmation_channel text CHECK (confirmation_channel IN ('button', 'voice')),
  confirmed_at timestamptz,
  report_id uuid,
  submitted_revision integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, submission_key),
  CONSTRAINT draft_confirmation_complete CHECK (
    (confirmed_revision IS NULL AND confirmation_channel IS NULL AND confirmed_at IS NULL)
    OR (confirmed_revision = revision AND confirmation_channel IS NOT NULL AND confirmed_at IS NOT NULL)
  ),
  CONSTRAINT draft_submission_complete CHECK (
    (report_id IS NULL AND submitted_revision IS NULL)
    OR (report_id IS NOT NULL AND submitted_revision = revision AND confirmed_revision = revision)
  )
);

CREATE INDEX report_drafts_owner_idx ON report_drafts(owner_id, updated_at DESC);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES actors(id),
  draft_id uuid NOT NULL UNIQUE REFERENCES report_drafts(id),
  submission_key uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('form', 'voice')),
  category_id text NOT NULL,
  issue_type text NOT NULL,
  summary text NOT NULL,
  original_observation text NOT NULL,
  severity text CHECK (severity IN ('low', 'medium', 'high')),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  location_label text NOT NULL,
  street text,
  building_number text,
  unit text,
  district text,
  location_precision text NOT NULL CHECK (location_precision IN ('building', 'street', 'point')),
  location_source text NOT NULL CHECK (location_source IN ('geocoder', 'map_pin', 'device')),
  location_candidate_id text,
  observed_at timestamptz,
  observed_time_state text NOT NULL CHECK (observed_time_state IN ('known', 'unknown')),
  scope text NOT NULL CHECK (scope IN ('unit', 'building', 'street', 'unknown')),
  urgent boolean NOT NULL DEFAULT false,
  triage_state text NOT NULL DEFAULT 'pending'
    CHECK (triage_state IN ('pending', 'linked', 'needs_review', 'private_issue', 'out_of_scope')),
  incident_id uuid,
  resident_next_step text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  is_demo boolean NOT NULL DEFAULT true,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, submission_key),
  CONSTRAINT report_observed_time_explicit CHECK ((observed_time_state = 'known') = (observed_at IS NOT NULL))
);

CREATE INDEX reports_owner_idx ON reports(owner_id, submitted_at DESC);
CREATE INDEX reports_triage_idx ON reports(triage_state, submitted_at);

ALTER TABLE report_drafts
  ADD CONSTRAINT report_drafts_report_fk FOREIGN KEY (report_id) REFERENCES reports(id);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_kind text NOT NULL CHECK (actor_kind IN ('session', 'system')),
  actor_id uuid REFERENCES actors(id),
  actor_role text NOT NULL,
  operation text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  related jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome text NOT NULL,
  reason text,
  correlation_id text NOT NULL
);

CREATE INDEX audit_events_entity_idx ON audit_events(entity_type, entity_id, occurred_at);
