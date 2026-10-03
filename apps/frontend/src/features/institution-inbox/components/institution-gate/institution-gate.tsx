"use client";

import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { Spinner } from "@appica/ui-react/spinner";
import { useState } from "react";
import { useI18n } from "@/shared/i18n/locale";
import { StaffSignIn } from "@/shared/components/staff-sign-in/staff-sign-in";
import { useStaffSession } from "@/shared/hooks/use-staff-session";
import { InstitutionInbox } from "../institution-inbox/institution-inbox";

/** The inbox opens only for an institution account; the server scopes every request to that account's institution. */
type InstitutionGateProps = {
  /** Server DEMO_MODE: no sign-in; the API acts as the seeded demo account. */
  demoMode: boolean;
};

export function InstitutionGate({ demoMode }: InstitutionGateProps) {
  return demoMode ? <DemoMode /> : <SignedIn />;
}

/** Demo mode never shows sign-in. A rejected request means the demo account is missing (not seeded). */
function DemoMode() {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center px-4">
        <Alert variant="error" className="max-w-sm">
          <AlertTitle>{t("auth.demoTitle")}</AlertTitle>
          <AlertDescription>{t("auth.demoBody")}</AlertDescription>
        </Alert>
      </div>
    );
  }
  return <InstitutionInbox onSessionLost={() => setFailed(true)} />;
}

function SignedIn() {
  const { t } = useI18n();
  const { state, retry, signedIn, sessionLost, signOut } = useStaffSession("institution");

  if (state.status === "ready") {
    // A different institution account must start from an empty inbox, not the previous one's state.
    return <InstitutionInbox key={state.actor.id} onSessionLost={sessionLost} onSignOut={() => void signOut()} />;
  }
  if (state.status === "signed_out") {
    return <StaffSignIn product={t("brand.institution")} title={t("auth.institutionTitle")} role="institution" notice={state.notice} onSignedIn={signedIn} />;
  }
  return (
    <div className="flex min-h-dvh w-full items-center justify-center px-4">
      {state.status === "loading" ? (
        <div role="status" className="flex items-center gap-2 text-sm text-foreground">
          <Spinner className="size-4 text-foreground-muted" aria-hidden />
          {t("auth.checking")}
        </div>
      ) : (
        <Alert variant="error" className="max-w-sm">
          <AlertTitle>{t("auth.checkFailed")}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            {state.message}
            <Button variant="outline" size="sm" onClick={retry}>{t("common.tryAgain")}</Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
