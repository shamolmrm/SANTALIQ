"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api, useSession } from "@/lib/api";

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "language", label: "Santali language: corrections, reviewing, advice" },
  { value: "data_request", label: "My data: copy, correction, deletion" },
  { value: "report", label: "Report content or a problem" },
  { value: "partnership", label: "Partnership, research or media" },
];

export default function ContactPage() {
  const { user } = useSession();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ status: string }>("/contact", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(f.entries())),
      });
      formEl.reset();
      setMsg({ tone: "success", text: r.status });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Could not send." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <PageHeader
        eyebrow="Contact"
        title="Talk to SANTALIQ"
        lead="Questions, corrections to Santali data, help with your account or data, or ideas to work together. We read every message."
      />
      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_280px]">
        <Card>
          <form onSubmit={submit} className="space-y-5">
            {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Your name">
                <Input name="name" required maxLength={120} defaultValue={user?.display_name ?? ""} key={user?.id ?? "anon"} />
              </Field>
              <Field label="Email for our reply">
                <Input name="email" type="email" required maxLength={254} defaultValue={user?.email ?? ""} key={`e-${user?.id ?? "anon"}`} />
              </Field>
            </div>
            <Field label="Topic">
              <Select name="topic" defaultValue="general">
                {TOPICS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Message">
              <Textarea name="message" required minLength={10} maxLength={5000} rows={7} />
            </Field>
            {/* honeypot for bots; hidden from people and screen readers */}
            <div aria-hidden className="absolute -left-[9999px]">
              <label>
                Website <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send message"}
            </Button>
          </form>
        </Card>
        <div className="space-y-4 text-sm text-muted">
          <p>
            <strong className="text-fg">Delete your data?</strong> You can delete your account yourself on your{" "}
            <Link href="/account" className="font-semibold text-accent">
              account page
            </Link>
            , and voice recordings on the{" "}
            <Link href="/voice" className="font-semibold text-accent">
              Voice page
            </Link>
            .
          </p>
          <p>
            We reply by email, usually within a few days and within 30 days for data requests. See our{" "}
            <Link href="/privacy" className="font-semibold text-accent">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
