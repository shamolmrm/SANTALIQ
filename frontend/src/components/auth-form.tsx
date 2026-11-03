"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useFeatures } from "@/components/account-security";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api, notifyAuthChanged, type User } from "@/lib/api";
import { useT } from "@/lib/i18n";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { email } = useFeatures();
  const t = useT().auth;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api<User>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      notifyAuthChanged();
      const next = params.get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
      setBusy(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <Alert>{error}</Alert>}
      {isRegister && (
        <Field label={t.name} hint={t.nameHint}>
          <Input name="display_name" required maxLength={80} autoComplete="name" />
        </Field>
      )}
      <Field label={t.email}>
        <Input name="email" type="email" required maxLength={254} autoComplete="email" />
      </Field>
      <Field label={t.password} hint={isRegister ? t.passwordHint : undefined}>
        <Input
          name="password"
          type="password"
          required
          minLength={isRegister ? 10 : 1}
          maxLength={200}
          autoComplete={isRegister ? "new-password" : "current-password"}
        />
      </Field>
      {!isRegister && email && (
        <p className="-mt-2 text-right text-sm">
          <Link href="/forgot-password" className="text-muted hover:text-fg">
            {t.forgot}
          </Link>
        </p>
      )}
      {isRegister && (
        <p className="text-xs text-muted">
          {t.agree1}{" "}
          <Link href="/terms" className="underline hover:text-fg">
            {t.terms}
          </Link>{" "}
          {t.and}{" "}
          <Link href="/privacy" className="underline hover:text-fg">
            {t.privacy}
          </Link>
          .
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full py-3">
        {busy ? t.wait : isRegister ? t.create : t.signIn}
      </Button>
      <p className="text-center text-sm text-muted">
        {isRegister ? t.haveAccount : t.newHere}
        <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-accent hover:underline">
          {isRegister ? t.signIn : t.createLink}
        </Link>
      </p>
    </form>
  );
}
