"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, EntryStatus, Input } from "@/components/ui";
import { api, type Status, type User } from "@/lib/api";
import { seconds, type VoiceClip } from "@/lib/voice";

/** Reviewer queue for SANTALIQ Voice recordings. */
export function VoiceQueue({ me }: { me: User }) {
  const [status, setStatus] = useState<Status>("pending");
  const [clips, setClips] = useState<VoiceClip[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<VoiceClip[]>(`/admin/voice?status=${status}`)
      .then(setClips)
      .catch((e) => setError(e.message));
  }, [status]);
  useEffect(load, [load]);

  async function decide(id: string, decision: "verified" | "rejected") {
    setError(null);
    try {
      await api(`/admin/voice/${id}`, { method: "POST", body: JSON.stringify({ decision, note: notes[id]?.trim() || null }) });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Voice review</h2>
        <div role="tablist" className="flex gap-2">
          {(["pending", "verified", "rejected"] as Status[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={status === s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-4 py-1.5 text-sm capitalize ${status === s ? "bg-fg text-bg" : "border border-line text-muted"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">
        Verify only if the speech clearly matches the text and the audio is understandable. Reject noise, silence or another
        person&apos;s voice.
      </p>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {!clips && <p className="text-muted">Loading…</p>}
        {clips?.length === 0 && <Alert tone="info">Nothing {status} right now.</Alert>}
        {clips?.map((c) => (
          <Card key={c.id} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-2xl font-bold">{c.text}</p>
                <p className="text-xs text-muted">
                  {c.speaker.display_name}
                  {c.dialect && ` · ${c.dialect}`} · {seconds(c.duration_ms)}
                </p>
              </div>
              <EntryStatus status={c.status} />
            </div>
            <audio controls preload="none" src={c.audio_url} className="h-9 w-full" />
            {c.review_note && status !== "pending" && <p className="text-sm text-muted">Note: {c.review_note}</p>}
            {status === "pending" ? (
              <div className="space-y-2">
                <Input
                  placeholder="Note for the speaker (optional)"
                  value={notes[c.id] ?? ""}
                  onChange={(ev) => setNotes((n) => ({ ...n, [c.id]: ev.target.value }))}
                  maxLength={2000}
                />
                <div className="flex gap-2">
                  <Button onClick={() => decide(c.id, "verified")}>Verify</Button>
                  <Button variant="danger" onClick={() => decide(c.id, "rejected")}>
                    Reject
                  </Button>
                </div>
              </div>
            ) : (
              me.role === "admin" && (
                <Button variant="secondary" onClick={() => decide(c.id, status === "verified" ? "rejected" : "verified")}>
                  Change to {status === "verified" ? "rejected" : "verified"}
                </Button>
              )
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
