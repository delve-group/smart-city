"use client";

import { Alert, AlertDescription } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { Field, FieldLabel } from "@appica/ui-react/field";
import { Input } from "@appica/ui-react/input";
import { useState, type FormEvent } from "react";
import { login } from "@/api/auth/login";
import { AuthApiError, type SessionActor, type StaffRole } from "@/api/auth/types";
import { AppBrand } from "@/shared/components/app-brand/app-brand";
import { useI18n } from "@/shared/i18n/locale";
import type { SessionNotice } from "@/shared/hooks/use-staff-session";

type StaffSignInProps = {
  /** Second word of the lockup, e.g. "Operator". */
  product: string;
  title: string;
  /** The account kind this screen needs. The server decides the role; this only words the mismatch. */
  role: StaffRole;
  /** Why the form is shown instead of the workspace, if not simply signed out. */
  notice?: SessionNotice | null;
  onSignedIn: (actor: SessionActor) => void;
};

/** Sign-in for the separately provisioned demo staff accounts. There is no role switch: the account carries the role. */
export function StaffSignIn({ product, title, role, notice, onSignedIn }: StaffSignInProps) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError(t("auth.missing"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const actor = await login(username, password);
      if (actor.role !== role) {
        setError(t("auth.wrongRole", { role: role === "official" ? t("auth.roleOfficial") : t("auth.roleInstitution") }));
        return;
      }
      onSignedIn(actor);
    } catch (caught) {
      setError(
        caught instanceof AuthApiError && caught.code === "invalid_credentials"
          ? t("auth.badCredentials")
          : caught instanceof Error
            ? caught.message
            : t("auth.failed"),
      );
    } finally {
      // Keep the account name; clear only the password after a failed attempt.
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-10">
      <form onSubmit={handleSubmit} noValidate className="flex w-full max-w-sm flex-col gap-5">
        <AppBrand variant="plain" product={product} />
        <h2 className="text-xl font-semibold tracking-tight text-foreground-intense">{title}</h2>
        {notice && (
          <Alert variant="warning">
            <AlertDescription>{notice === "wrong_role" ? t("auth.wrongAccount") : t("auth.sessionEnded")}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel>{t("auth.account")}</FieldLabel>
          <Input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(event) => setUsername(event.target.value)} />
        </Field>
        <Field>
          <FieldLabel>{t("auth.password")}</FieldLabel>
          <Input name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-error">{error}</p>
        )}
        <Button type="submit" disabled={busy}>{busy ? t("common.signingIn") : t("common.signIn")}</Button>
      </form>
    </div>
  );
}
