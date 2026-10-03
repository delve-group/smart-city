export type ActorRole = "resident" | "official" | "institution";

export interface Actor {
  id: string;
  role: ActorRole;
  identity_kind: "guest" | "demo_staff";
  institution_id: string | null;
}

export interface Session {
  actor: Actor;
  expires_at: string;
}

export interface IssuedSession {
  token: string;
  session: Session;
}
