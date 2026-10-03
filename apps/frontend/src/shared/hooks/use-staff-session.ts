import { useEffect, useState } from "react";
import { getSession } from "@/api/auth/get-session";
import { logout } from "@/api/auth/logout";
import type { SessionActor, StaffRole } from "@/api/auth/types";

export type StaffSessionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  /** No usable staff session; `notice` says why when it is not a plain sign-out. */
  | { status: "signed_out"; notice: string | null }
  | { status: "ready"; actor: SessionActor };

/**
 * Restores the server session on load, so a reload keeps staff signed in. The role comes from
 * the account on the server; a session with another role is treated as signed out here.
 */
export function useStaffSession(role: StaffRole) {
  const [state, setState] = useState<StaffSessionState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getSession(controller.signal)
      .then((actor) => {
        if (actor?.role === role) setState({ status: "ready", actor });
        else setState({ status: "signed_out", notice: actor ? "You are signed in with a different kind of account. Sign in with the right one to continue." : null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: error instanceof Error ? error.message : "Could not check the session." });
      });
    return () => controller.abort();
  }, [role, attempt]);

  return {
    state,
    retry: () => {
      setState({ status: "loading" });
      setAttempt((value) => value + 1);
    },
    signedIn: (actor: SessionActor) => setState({ status: "ready", actor }),
    /** The server rejected a request mid-session (expired, revoked or replaced). */
    sessionLost: () => setState({ status: "signed_out", notice: "Your session ended. Sign in again; nothing you had not saved was sent." }),
    signOut: async () => {
      await logout().catch(() => undefined);
      setState({ status: "signed_out", notice: null });
    },
  };
}
