-- Fictional PoC service directory. These rules do not establish real Krakow ownership.
INSERT INTO institutions (id, name, is_demo)
VALUES ('demo-roads', 'Road and Street Service', true),
       ('demo-transit', 'Public Transport Service', true),
       ('demo-waste', 'Waste Service', true),
       ('demo-property', 'Building Maintenance Service', true),
       ('demo-greenery', 'Greenery Service', true),
       ('demo-environment', 'Environmental Service', true)
ON CONFLICT (id) DO NOTHING;

-- Requeue only reports stopped by the retired category gate. Preserve human review,
-- linked reports, urgency and private scope. New versions invalidate old job results.
WITH retry AS (
  UPDATE reports
  SET triage_state = 'pending', review_reason = NULL, review_note = NULL, review_since = NULL,
      review_candidates = '[]'::jsonb, triage_policy = NULL, version = version + 1, updated_at = now()
  WHERE triage_state = 'needs_review' AND incident_id IS NULL AND review_reason = 'needs_link'
    AND review_note = 'Automatic grouping covers power outages only. Triage this report manually.'
    AND NOT urgent AND scope <> 'unit'
  RETURNING id, version
), audited AS (
  INSERT INTO audit_events (actor_kind, actor_role, operation, entity_type, entity_id, related, outcome, reason, correlation_id)
  SELECT 'system', 'triage', 'report.requeue', 'report', id,
         jsonb_build_object('report_version', version, 'migration', '010_demo_issue_responsibility.sql'),
         'pending', 'Retired the power-only incident creation gate.', 'migration:010:report:' || id::text
  FROM retry
)
INSERT INTO work_items (kind, source_type, source_id, source_version, idempotency_key, correlation_id)
SELECT jobs.kind, 'report', retry.id::text, retry.version,
       jobs.kind || ':report:' || retry.id::text || ':v' || retry.version::text,
       'migration:010:report:' || retry.id::text
FROM retry CROSS JOIN (VALUES ('triage'), ('index')) AS jobs(kind)
ON CONFLICT (idempotency_key) DO NOTHING;

-- Repeat the existing directory entries so this migration also works before first seeding.
INSERT INTO institutions (id, name, is_demo)
VALUES ('demo-electricity', 'Electricity Service', true),
       ('demo-water', 'Water Service', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO responsibility_rules (id, category_id, issue_type, institution_id)
VALUES ('demo-rule-water-drain', 'water', 'blocked_drain', 'demo-water'),
       ('demo-rule-road-pothole', 'roads', 'pothole', 'demo-roads'),
       ('demo-rule-road-signal', 'roads', 'traffic_signal_fault', 'demo-roads'),
       ('demo-rule-transit-disruption', 'transit', 'transit_disruption', 'demo-transit'),
       ('demo-rule-waste-dumping', 'waste', 'illegal_dumping', 'demo-waste'),
       ('demo-rule-waste-bin', 'waste', 'overflowing_bin', 'demo-waste'),
       ('demo-rule-accessibility-lift', 'accessibility', 'broken_lift', 'demo-property'),
       ('demo-rule-accessibility-access', 'accessibility', 'blocked_access', 'demo-roads'),
       ('demo-rule-greenery-tree', 'greenery', 'fallen_tree', 'demo-greenery'),
       ('demo-rule-environment-smoke', 'air', 'smoke', 'demo-environment'),
       ('demo-rule-environment-noise', 'air', 'noise', 'demo-environment')
ON CONFLICT (id) DO NOTHING;
