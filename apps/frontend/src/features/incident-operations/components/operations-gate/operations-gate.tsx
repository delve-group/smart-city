"use client";

import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { Spinner } from "@appica/ui-react/spinner";
import { StaffSignIn } from "@/shared/components/staff-sign-in/staff-sign-in";
import { useStaffSession } from "@/shared/hooks/use-staff-session";
import { OperationsWorkspace } from "../operations-workspace/operations-workspace";

/** The workspace opens only for an official session; the server enforces the same on every request. */
export function OperationsGate() {
  const { state, retry, signedIn, sessionLost, signOut } = useStaffSession("official");

  if (state.status === "ready") return <OperationsWorkspace onSessionLost={sessionLost} onSignOut={() => void signOut()} />;
  if (state.status === "signed_out") {
    return <StaffSignIn product="Operator" title="Sign in to the operations workspace" role="official" notice={state.notice} onSignedIn={signedIn} />;
  }
  return (
    <div className="flex min-h-dvh w-full items-center justify-center px-4">
      {state.status === "loading" ? (
        <div role="status" className="flex items-center gap-2 text-sm text-foreground">
          <Spinner className="size-4 text-foreground-muted" aria-hidden />
          Checking your session…
        </div>
      ) : (
        <Alert variant="error" className="max-w-sm">
          <AlertTitle>Could not check your session</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            {state.message}
            <Button variant="outline" size="sm" onClick={retry}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
