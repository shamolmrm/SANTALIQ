"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api, notifyAuthChanged } from "@/lib/api";

import { tr } from "@/lib/i18n";
export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      setError(tr("The two passwords do not match."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/auth/password/reset", { method: "POST", body: JSON.stringify({ token, password: form.get("password") }) });
      notifyAuthChanged();
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Something went wrong."));
      setBusy(false);
    }
  }

  if (!token) return <Alert>{tr("This reset link is incomplete. Please use the link from your email.")}</Alert>;

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <Alert>{error}</Alert>}
      <Field label={tr("New password")} hint={tr("At least 10 characters.")}>
        <Input name="password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" />
      </Field>
      <Field label={tr("Repeat new password")}>
        <Input name="confirm" type="password" required minLength={10} maxLength={200} autoComplete="new-password" />
      </Field>
      <Button type="submit" disabled={busy} className="w-full py-3">
        {busy ? tr("Saving…") : tr("Set new password")}
      </Button>
    </form>
  );
}
