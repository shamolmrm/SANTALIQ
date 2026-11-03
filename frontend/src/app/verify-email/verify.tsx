"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui";
import { api, notifyAuthChanged } from "@/lib/api";

import { tr } from "@/lib/i18n";
export function Verify() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"working" | "done" | string>(token ? "working" : "This link is incomplete.");
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    api("/auth/verify/confirm", { method: "POST", body: JSON.stringify({ token }) })
      .then(() => {
        setState("done");
        notifyAuthChanged();
      })
      .catch((e) => setState(e instanceof Error ? e.message : "Verification failed."));
  }, [token]);

  if (state === "working") return <p className="text-muted">{tr("Confirming your email…")}</p>;
  if (state === "done")
    return (
      <div className="space-y-4">
        <Alert tone="success">{tr("Your email is confirmed. Thank you!")}</Alert>
        <Link href="/account" className="inline-flex rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-bg">
          {tr("Go to your account")}</Link>
      </div>
    );
  return <Alert>{state}</Alert>;
}
