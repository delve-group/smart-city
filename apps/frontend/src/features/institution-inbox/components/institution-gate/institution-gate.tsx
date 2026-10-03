"use client";

import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { Spinner } from "@appica/ui-react/spinner";
import { StaffSignIn } from "@/shared/components/staff-sign-in/staff-sign-in";
import { useStaffSession } from "@/shared/hooks/use-staff-session";
import { InstitutionInbox } from "../institution-inbox/institution-inbox";

/** The inbox opens only for an institution account; the server scopes every request to that account's institution. */
export function InstitutionGate() {
  const { state, retry, signedIn, sessionLost, signOut } = useStaffSession("institution");

  if (state.status === "ready") {
    // A different institution account must start from an empty inbox, not the previous one's state.
    return <InstitutionInbox key={state.actor.id} onSessionLost={sessionLost} onSignOut={() => void signOut()} />;
  }
  if (state.status === "signed_out") {
    return <StaffSignIn product="Institution" title="Sign in to your institution inbox" role="institution" notice={state.notice} onSignedIn={signedIn} />;
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
