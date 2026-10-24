CREATE TABLE lab_sessions (
  namespace TEXT NOT NULL,
  token TEXT NOT NULL,
  state TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY(namespace, token)
);
--> statement-breakpoint
CREATE INDEX lab_sessions_expiry ON lab_sessions(expires_at);
