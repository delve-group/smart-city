CREATE TABLE voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  draft_id uuid NOT NULL REFERENCES report_drafts(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  agent_version_id text NOT NULL,
  provider_conversation_id text,
  location_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
  ended_at timestamptz,
  CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX voice_sessions_one_active_owner ON voice_sessions(owner_id) WHERE ended_at IS NULL;
CREATE INDEX voice_sessions_owner_starts ON voice_sessions(owner_id, created_at DESC);
