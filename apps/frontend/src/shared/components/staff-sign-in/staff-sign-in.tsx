"use client";

import { Alert, AlertDescription } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { Field, FieldLabel } from "@appica/ui-react/field";
import { Input } from "@appica/ui-react/input";
import { useState, type FormEvent } from "react";
import { login } from "@/api/auth/login";
import { AuthApiError, type SessionActor, type StaffRole } from "@/api/auth/types";
import { AppBrand } from "@/shared/components/app-brand/app-brand";

type StaffSignInProps = {
  /** Second word of the lockup, e.g. "Operator". */
  product: string;
  title: string;
  /** The account kind this screen needs. The server decides the role; this only words the mismatch. */
  role: StaffRole;
  /** Why the form is shown instead of the workspace, if not simply signed out. */
  notice?: string | null;
  onSignedIn: (actor: SessionActor) => void;
};

/** Sign-in for the separately provisioned demo staff accounts. There is no role switch: the account carries the role. */
export function StaffSignIn({ product, title, role, notice, onSignedIn }: StaffSignInProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter the account name and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const actor = await login(username, password);
      if (actor.role !== role) {
        setError(`That account is not ${role === "official" ? "an official" : "an institution"} account. Use the right account for this screen.`);
        return;
      }
      onSignedIn(actor);
    } catch (caught) {
      setError(
        caught instanceof AuthApiError && caught.code === "invalid_credentials"
          ? "The account name or password is not right."
          : caught instanceof Error
            ? caught.message
            : "Could not sign in. Try again.",
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
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground-intense">{title}</h2>
          <p className="text-sm text-pretty text-foreground-muted">
            Demo staff accounts with fictional data. This is not a city or government sign-in.
          </p>
        </div>
        {notice && (
          <Alert variant="warning">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel>Account</FieldLabel>
          <Input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(event) => setUsername(event.target.value)} />
        </Field>
        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-error">{error}</p>
        )}
        <Button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
    </div>
  );
}
