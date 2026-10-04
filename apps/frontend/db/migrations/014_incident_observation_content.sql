-- Content is independent of classification/routing. Raw narratives remain official-only.
ALTER TABLE incidents ADD COLUMN description text NOT NULL DEFAULT '';
ALTER TABLE incidents ADD COLUMN public_content jsonb;

-- Recover the first linked observation, without publishing private text.
UPDATE incidents i SET title = r.summary, description = r.original_observation,
  version = i.version + 1, updated_at = now()
FROM (SELECT DISTINCT ON (incident_id) incident_id, summary, original_observation
      FROM reports WHERE incident_id IS NOT NULL ORDER BY incident_id, submitted_at, id) r
WHERE i.id = r.incident_id;

-- Previous approvals describe the previous payload. Keep executed/history records unchanged.
UPDATE action_proposals SET state = 'superseded'
WHERE state IN ('pending', 'approved') AND incident_id IN
  (SELECT DISTINCT incident_id FROM reports WHERE incident_id IS NOT NULL);

-- Private history for explicit corrections to already-created demo requests.
CREATE TABLE service_ticket_content_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES service_tickets(id),
  ticket_version integer NOT NULL,
  payload jsonb NOT NULL,
  corrected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, ticket_version)
);
