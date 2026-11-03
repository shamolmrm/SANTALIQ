"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { api, notifyAuthChanged, type User } from "@/lib/api";

import { tr } from "@/lib/i18n";
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
      setMsg({ tone: "error", text: e instanceof Error ? e.message : tr("Could not send.") });
    }
  }
  return (
    <Alert tone={msg?.tone ?? "info"}>
      {msg?.text ?? tr("Please confirm your email address.")}{" "}
      {!msg && (
        <button onClick={resend} className="font-semibold text-accent underline">
          {tr("Send confirmation link")}</button>
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
      setMsg({ tone: "error", text: tr("The two new passwords do not match.") });
      return;
    }
    setBusy(true);
    try {
      await api("/auth/password/change", {
        method: "POST",
        body: JSON.stringify({ current_password: form.get("current_password"), new_password: form.get("new_password") }),
      });
      formEl.reset();
      setMsg({ tone: "success", text: tr("Password changed. Other devices have been signed out.") });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : tr("Could not change password.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-bold">{tr("Change password")}</h2>
      <form onSubmit={submit} className="mt-4 space-y-4">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Field label={tr("Current password")}>
          <Input name="current_password" type="password" required autoComplete="current-password" />
        </Field>
        <Field label={tr("New password")} hint={tr("At least 10 characters.")}>
          <Input name="new_password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" />
        </Field>
        <Field label={tr("Repeat new password")}>
          <Input name="confirm" type="password" required minLength={10} maxLength={200} autoComplete="new-password" />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? tr("Saving…") : tr("Change password")}
        </Button>
      </form>
    </Card>
  );
}

export function ProfileEditor({ user }: { user: User }) {
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api("/people/me", {
        method: "PATCH",
        body: JSON.stringify({ display_name: form.get("display_name"), bio: form.get("bio") }),
      });
      notifyAuthChanged();
      setMsg({ tone: "success", text: tr("Profile saved.") });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : tr("Could not save profile.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">{tr("Public profile")}</h2>
        <Link href={`/people/${user.id}`} className="text-sm font-semibold text-accent">
          {tr("View my profile →")}</Link>
      </div>
      <p className="mt-1 text-sm text-muted">{tr("Shown with your writing and contributions. Your email is never shown.")}</p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Field label={tr("Display name")}>
          <Input name="display_name" defaultValue={user.display_name} required maxLength={80} />
        </Field>
        <Field label={tr("About you")} hint={tr("Up to 500 characters, in any script.")}>
          <Textarea name="bio" defaultValue={user.bio ?? ""} rows={4} maxLength={500} />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? tr("Saving…") : tr("Save profile")}
        </Button>
      </form>
    </Card>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("confirm") !== "DELETE") {
      setError(tr("Type DELETE in capital letters to confirm."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/auth/account", { method: "DELETE", body: JSON.stringify({ password: f.get("password"), confirm: "DELETE" }) });
      notifyAuthChanged();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Could not delete the account."));
      setBusy(false);
    }
  }

  return (
    <Card className="border-red-500/30">
      <h2 className="text-lg font-bold">{tr("Delete account")}</h2>
      <p className="mt-1 text-sm text-muted">
        {tr("Permanently deletes your account, writing, heritage submissions, voice recordings and consent. Verified dictionary entries stay in the open dictionary without your name. This cannot be undone.")}</p>
      {!open ? (
        <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>
          {tr("Delete my account…")}</Button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label={tr("Your password")}>
            <Input name="password" type="password" required autoComplete="current-password" />
          </Field>
          <Field label={tr("Type DELETE to confirm")}>
            <Input name="confirm" required autoComplete="off" />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="danger" disabled={busy}>
              {busy ? tr("Deleting…") : tr("Delete permanently")}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {tr("Cancel")}</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
