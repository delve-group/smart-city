CREATE TABLE institutions (
  id text PRIMARY KEY,
  name text NOT NULL,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE actors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('resident', 'official', 'institution')),
  identity_kind text NOT NULL CHECK (identity_kind IN ('guest', 'demo_staff')),
  username text UNIQUE,
  password_hash text,
  institution_id text REFERENCES institutions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT actor_identity_consistency CHECK (
    (
      identity_kind = 'guest' AND role = 'resident'
      AND username IS NULL AND password_hash IS NULL AND institution_id IS NULL
    ) OR (
      identity_kind = 'demo_staff'
      AND username IS NOT NULL AND username = lower(username) AND length(username) > 0
      AND password_hash IS NOT NULL
      AND (
        (role = 'official' AND institution_id IS NULL)
        OR (role = 'institution' AND institution_id IS NOT NULL)
      )
    )
  )
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  actor_id uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE INDEX sessions_actor_id_idx ON sessions(actor_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE auth_login_attempts (
  key_hash text PRIMARY KEY CHECK (key_hash ~ '^[a-f0-9]{64}$'),
  attempts integer NOT NULL CHECK (attempts >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now()
);
