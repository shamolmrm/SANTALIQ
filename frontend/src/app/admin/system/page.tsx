"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminOnly, AdminTitle, useAdmin } from "@/components/admin/shell";
import { Alert, Button, Card } from "@/components/ui";
import { api } from "@/lib/api";
import { type ErrorItem, hoursSince, type SystemInfo, timeAgo } from "@/lib/admin";

const SERVICE_LABEL: Record<string, string> = {
  database: "PostgreSQL database",
  redis: "Redis (cache & rate limits)",
  translate: "Translator engine (NLLB)",
};

const FEATURE: Record<string, { label: string; off: string }> = {
  ai_chat: { label: "SANTALIQ AI chat (Claude)", off: "Set ANTHROPIC_API_KEY in the server .env (paid)" },
  google_translate: { label: "Google Translate engine", off: "Set GOOGLE_TRANSLATE_API_KEY in the server .env (paid)" },
  email: { label: "Email (verification, password reset)", off: "Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, MAIL_FROM in the server .env" },
};

function Dot({ ok }: { ok: boolean }) {
  return <span className={`inline-block size-2.5 rounded-full ${ok ? "bg-accent" : "bg-red-600"}`} aria-hidden />;
}

function System() {
  const [s, setS] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [at, setAt] = useState(0);

  useEffect(() => {
    api<SystemInfo>("/admin/system")
      .then(setS)
      .catch((e) => setError(e.message));
  }, [at]);

  if (error) return <Alert>{error}</Alert>;
  if (!s) return <p className="text-muted">Checking…</p>;
  const usedPct = s.disk_total_gb && s.disk_free_gb != null ? Math.round(((s.disk_total_gb - s.disk_free_gb) / s.disk_total_gb) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Services</h2>
            <Button variant="secondary" onClick={() => setAt((n) => n + 1)}>
              Re-check
            </Button>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {Object.entries(s.checks).map(([k, ok]) => (
              <li key={k} className="flex items-center gap-3">
                <Dot ok={ok} />
                <span className="flex-1">{SERVICE_LABEL[k] ?? k}</span>
                <span className={ok ? "text-accent" : "font-semibold text-red-600"}>{ok ? "running" : "down"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">Environment: {s.environment}</p>
        </Card>

        <Card>
          <h2 className="font-bold">Features</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {Object.entries(s.features).map(([k, on]) => (
              <li key={k}>
                <div className="flex items-center gap-3">
                  <Dot ok={on} />
                  <span className="flex-1">{FEATURE[k]?.label ?? k}</span>
                  <span className={on ? "text-accent" : "text-muted"}>{on ? "on" : "off"}</span>
                </div>
                {!on && FEATURE[k] && <p className="mt-1 pl-5 text-xs text-muted">{FEATURE[k].off}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">AI model: {s.ai_model}. Keys are never shown here.</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold">Backups</h2>
          {s.last_backup_at ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Last server backup</dt>
                <dd title={new Date(s.last_backup_at).toLocaleString()}>{timeAgo(s.last_backup_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Database dump</dt>
                <dd className="truncate">
                  {s.last_backup?.file} ({s.last_backup?.size})
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Voice files mirrored</dt>
                <dd>{s.last_backup?.voice_files ?? 0}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted">No backup reported yet. The nightly job runs at 03:15 server time.</p>
          )}
          <p className="mt-4 text-xs text-muted">
            Nightly at 03:15 on the server (14 days kept). The owner&apos;s PC pulls a copy with scripts\pull-backup.ps1.
          </p>
          {s.last_backup_at && hoursSince(s.last_backup_at) > 36 && (
            <div className="mt-4">
              <Alert>The last backup is more than 36 hours old. Check /var/log/santaliq-backup.log on the server.</Alert>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-bold">Storage</h2>
          {usedPct != null && (
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Server disk</span>
                <span>
                  {s.disk_free_gb} GB free of {s.disk_total_gb} GB
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-sunken">
                <div className={`h-full ${usedPct > 85 ? "bg-red-600" : "bg-accent"}`} style={{ width: `${usedPct}%` }} />
              </div>
            </div>
          )}
          <p className="mt-4 text-sm">
            <span className="text-muted">Voice recordings:</span> {s.voice_storage_mb} MB
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {Object.entries(s.database_rows).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-muted">{k.replace(/_/g, " ")}</dt>
                <dd className="tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card>
        <h2 className="font-bold">Settings</h2>
        <p className="mt-2 text-sm">
          <span className="text-muted">Open dataset licence:</span> {s.dataset_license}
        </p>
        <p className="mt-2 text-xs text-muted">
          Secrets and switches live in the server&apos;s .env file and are applied by redeploying. They are not editable from the browser on
          purpose, so a stolen admin session cannot change keys.
        </p>
      </Card>
    </div>
  );
}

const SOURCE_LABEL: Record<string, string> = { api: "Server", web: "Browser", csp: "Security policy" };

function Errors() {
  const { refresh } = useAdmin();
  const [resolved, setResolved] = useState(false);
  const [items, setItems] = useState<ErrorItem[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    api<ErrorItem[]>(`/admin/errors?resolved=${resolved}`)
      .then(setItems)
      .catch(() => setItems([]));
  }, [resolved]);
  useEffect(load, [load]);

  async function resolve(id: string) {
    await api(`/admin/errors/${id}/resolve`, { method: "POST" });
    load();
    refresh();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">Errors</h2>
        <div className="flex gap-2 text-sm">
          {[false, true].map((r) => (
            <button
              key={String(r)}
              onClick={() => setResolved(r)}
              className={`rounded-full px-3 py-1 ${resolved === r ? "bg-fg text-bg" : "border border-line text-muted"}`}
            >
              {r ? "Resolved" : "Open"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">
        Unexpected errors from the server and visitors&apos; browsers, grouped. New ones are emailed to ALERT_EMAIL (or CONTACT_NOTIFY_EMAIL)
        when set, at most hourly.
      </p>
      {!items && <p className="mt-4 text-sm text-muted">Loading…</p>}
      {items?.length === 0 && <p className="mt-4 text-sm text-accent">{resolved ? "Nothing resolved yet." : "● No open errors."}</p>}
      <ul className="mt-4 divide-y divide-line">
        {items?.map((e) => (
          <li key={e.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-start gap-3">
              <span className="rounded-full bg-bg-sunken px-2 py-0.5 text-xs">{SOURCE_LABEL[e.source] ?? e.source}</span>
              <button onClick={() => setOpen(open === e.id ? null : e.id)} className="min-w-0 flex-1 text-left">
                <span className="font-semibold">{e.kind}</span> <span className="text-muted break-words">{e.message}</span>
                <span className="block text-xs text-muted">
                  {e.detail?.path ?? e.detail?.url ?? ""} · ×{e.count} · last {timeAgo(e.last_seen)}
                </span>
              </button>
              {!e.resolved && (
                <Button variant="secondary" onClick={() => resolve(e.id)}>
                  Resolve
                </Button>
              )}
            </div>
            {open === e.id && (e.detail?.trace || e.detail?.stack) && (
              <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-bg-sunken p-3 text-xs whitespace-pre-wrap">
                {e.detail?.trace ?? e.detail?.stack}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function SystemPage() {
  return (
    <AdminOnly>
      <AdminTitle title="System" lead="Health, features, backups and storage." />
      <div className="space-y-6">
        <Errors />
        <System />
      </div>
    </AdminOnly>
  );
}
