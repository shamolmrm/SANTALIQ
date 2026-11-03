"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api } from "@/lib/api";

import { tr } from "@/lib/i18n";
export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ status: string }>("/auth/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email: new FormData(e.currentTarget).get("email") }),
      });
      setMessage(r.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="text-center font-display text-3xl font-bold tracking-tight">{tr("Forgot your password?")}</h1>
      <p className="mt-2 text-center text-muted">{tr("We will email you a link to set a new one.")}</p>
      <Card className="mt-8 space-y-5">
        {message ? (
          <Alert tone="success">{message}</Alert>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {error && <Alert>{error}</Alert>}
            <Field label={tr("Email")}>
              <Input name="email" type="email" required maxLength={254} autoComplete="email" />
            </Field>
            <Button type="submit" disabled={busy} className="w-full py-3">
              {busy ? tr("Sending…") : tr("Send reset link")}
            </Button>
          </form>
        )}
        <p className="text-center text-sm">
          <Link href="/login" className="font-semibold text-accent hover:underline">
            {tr("Back to sign in")}</Link>
        </p>
      </Card>
    </section>
  );
}
