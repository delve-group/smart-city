-- An at-least-once assessment must replay its proposal, including after approval.
ALTER TABLE action_proposals ADD COLUMN assessment_key text UNIQUE
  CHECK (assessment_key IS NULL OR length(assessment_key) BETWEEN 1 AND 300);
