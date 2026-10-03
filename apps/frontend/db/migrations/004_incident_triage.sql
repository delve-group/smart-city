-- Incidents, their evidence and support, and the review state of reports.

CREATE SEQUENCE incident_reference_seq START 201;

CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  category_id text NOT NULL,
  issue_type text NOT NULL,
  title text NOT NULL,
  -- Fixed matching anchor: never moved by later reports.
  anchor_lat double precision NOT NULL,
  anchor_lng double precision NOT NULL,
  anchor_observed_at timestamptz,
  service_area_id text NOT NULL,
  street_key text,
  building_key text,
  scope text NOT NULL CHECK (scope IN ('building', 'street')),
  public_label text NOT NULL,
  public_precision text NOT NULL CHECK (public_precision IN ('street', 'building')),
  district text,
  assessment text NOT NULL DEFAULT 'suspected'
    CHECK (assessment IN ('suspected', 'corroborated', 'verified', 'disputed')),
  response_status text NOT NULL DEFAULT 'new'
    CHECK (response_status IN ('new', 'triaged', 'assigned', 'in_progress', 'resolved', 'closed')),
  support_count integer NOT NULL DEFAULT 0 CHECK (support_count >= 0),
  urgent boolean NOT NULL DEFAULT false,
  responsible_institution_id text REFERENCES institutions(id),
  responsibility_rule_id text,
  review_reason text,
  review_note text,
  review_since timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX incidents_updated_idx ON incidents(updated_at DESC, id DESC);
CREATE INDEX incidents_matching_idx ON incidents(category_id, issue_type, response_status);

ALTER TABLE reports
  ADD CONSTRAINT reports_incident_fk FOREIGN KEY (incident_id) REFERENCES incidents(id),
  ADD COLUMN review_reason text,
  ADD COLUMN review_note text,
  ADD COLUMN review_since timestamptz,
  ADD COLUMN review_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN triage_policy jsonb;

CREATE INDEX reports_incident_idx ON reports(incident_id);

-- Every link a report has had; reports.incident_id is the current one.
CREATE TABLE incident_report_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id),
  incident_id uuid NOT NULL REFERENCES incidents(id),
  linked_at timestamptz NOT NULL DEFAULT now(),
  linked_by text NOT NULL,
  reason text,
  unlinked_at timestamptz,
  unlink_reason text
);

CREATE UNIQUE INDEX incident_report_links_current_idx ON incident_report_links(report_id) WHERE unlinked_at IS NULL;
CREATE INDEX incident_report_links_incident_idx ON incident_report_links(incident_id);

-- Explicit "I'm affected too" membership: one row per identity and incident.
CREATE TABLE incident_contributions (
  incident_id uuid NOT NULL REFERENCES incidents(id),
  resident_id uuid NOT NULL REFERENCES actors(id),
  source text NOT NULL DEFAULT 'affected' CHECK (source IN ('affected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (incident_id, resident_id)
);

CREATE TABLE incident_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id),
  report_id uuid REFERENCES reports(id),
  kind text NOT NULL CHECK (kind IN ('report', 'observation')),
  label text NOT NULL,
  source text NOT NULL,
  observed_at timestamptz,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  provenance text NOT NULL DEFAULT 'demo' CHECK (provenance IN ('demo', 'live')),
  state text NOT NULL DEFAULT 'current' CHECK (state IN ('current', 'stale', 'missing', 'contradictory')),
  note text,
  access_scope text NOT NULL DEFAULT 'official' CHECK (access_scope IN ('official')),
  removed_at timestamptz
);

CREATE INDEX incident_evidence_incident_idx ON incident_evidence(incident_id);

-- Public timeline: kind only; the text shown comes from a controlled template per kind.
CREATE TABLE incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id),
  kind text NOT NULL CHECK (kind IN ('reported', 'corroborated', 'verified', 'disputed', 'assigned', 'acknowledged',
    'work_started', 'resolved', 'returned_to_review', 'closed', 'reopened')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX incident_events_incident_idx ON incident_events(incident_id, occurred_at);

-- Demo configuration: which fictional institution answers for a category/issue in an area.
CREATE TABLE responsibility_rules (
  id text PRIMARY KEY,
  category_id text NOT NULL,
  issue_type text,
  service_area_id text,
  institution_id text NOT NULL REFERENCES institutions(id),
  ruleset_version integer NOT NULL DEFAULT 1,
  is_demo boolean NOT NULL DEFAULT true
);
