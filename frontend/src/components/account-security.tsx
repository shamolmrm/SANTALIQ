"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api, type User } from "@/lib/api";

export function useFeatures() {
  const [email, setEmail] = useState(false);
  useEffect(() => {
    api<{ email: boolean }>("/auth/features")
      .then((f) => setEmail(f.email))
      .catch(() => setEmail(false));
  }, []);
  return { email };
}

export function EmailVerification({ user }: { user: User }) {
  const { email } = useFeatures();
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  if (user.email_verified || !email) return null;
  async function resend() {
    try {
      await api("/auth/verify/request", { method: "POST" });
      setMsg({ tone: "success", text: `We sent a confirmation link to ${user.email}.` });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Could not send." });
    }
  }
  return (
    <Alert tone={msg?.tone ?? "info"}>
      {msg?.text ?? "Please confirm your email address."}{" "}
      {!msg && (
        <button onClick={resend} className="font-semibold text-accent underline">
          Send confirmation link
        </button>
      )}
    </Alert>
  );
}

export function ChangePassword() {
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    if (form.get("new_password") !== form.get("confirm")) {
      setMsg({ tone: "error", text: "The two new passwords do not match." });
      return;
    }
    setBusy(true);
    try {
      await api("/auth/password/change", {
        method: "POST",
        body: JSON.stringify({ current_password: form.get("current_password"), new_password: form.get("new_password") }),
      });
      formEl.reset();
      setMsg({ tone: "success", text: "Password changed. Other devices have been signed out." });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Could not change password." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-bold">Change password</h2>
      <form onSubmit={submit} className="mt-4 space-y-4">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Field label="Current password">
          <Input name="current_password" type="password" required autoComplete="current-password" />
        </Field>
        <Field label="New password" hint="At least 10 characters.">
          <Input name="new_password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" />
        </Field>
        <Field label="Repeat new password">
          <Input name="confirm" type="password" required minLength={10} maxLength={200} autoComplete="new-password" />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Change password"}
        </Button>
      </form>
    </Card>
  );
}
