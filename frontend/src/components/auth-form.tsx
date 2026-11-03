"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useFeatures } from "@/components/account-security";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api, notifyAuthChanged, type User } from "@/lib/api";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { email } = useFeatures();

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
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <Alert>{error}</Alert>}
      {isRegister && (
        <Field label="Your name" hint="Shown as the contributor on entries you add.">
          <Input name="display_name" required maxLength={80} autoComplete="name" />
        </Field>
      )}
      <Field label="Email">
        <Input name="email" type="email" required maxLength={254} autoComplete="email" />
      </Field>
      <Field label="Password" hint={isRegister ? "At least 10 characters." : undefined}>
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
            Forgot password?
          </Link>
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full py-3">
        {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted">
        {isRegister ? "Already have an account? " : "New to SANTALIQ? "}
        <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-accent hover:underline">
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
