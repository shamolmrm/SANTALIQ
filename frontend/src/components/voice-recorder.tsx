"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { extensionFor, MAX_SECONDS, pickMimeType } from "@/lib/voice";

export type Recording = { blob: Blob; url: string; durationMs: number; fileName: string };

/** Microphone recorder with a hard 30-second cap, preview and re-record. */
export function VoiceRecorder({ onReady, disabled }: { onReady: (r: Recording | null) => void; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rec, setRec] = useState<Recording | null>(null);
  const media = useRef<MediaRecorder | null>(null);
  const timers = useRef<{ tick?: number; cap?: number; started: number }>({ started: 0 });

  // release the microphone and preview URL when leaving the page
  useEffect(
    () => () => {
      media.current?.stream.getTracks().forEach((t) => t.stop());
      window.clearInterval(timers.current.tick);
      window.clearTimeout(timers.current.cap);
    },
    [],
  );
  useEffect(() => () => (rec ? URL.revokeObjectURL(rec.url) : undefined), [rec]);

  async function start() {
    setError(null);
    const mimeType = pickMimeType();
    if (!navigator.mediaDevices?.getUserMedia || mimeType === undefined) {
      setError("This browser cannot record audio. Please try a recent Chrome, Edge, Firefox or Safari.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("Microphone permission was denied. Allow the microphone for this site and try again.");
      return;
    }
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      window.clearInterval(timers.current.tick);
      window.clearTimeout(timers.current.cap);
      const durationMs = Math.min(Date.now() - timers.current.started, MAX_SECONDS * 1000);
      const type = recorder.mimeType || mimeType;
      const blob = new Blob(chunks, { type });
      if (durationMs < 400 || blob.size < 100) {
        setState("idle");
        setError("That was too short. Press record, speak, then stop.");
        onReady(null);
        return;
      }
      const r = { blob, url: URL.createObjectURL(blob), durationMs, fileName: `clip.${extensionFor(type)}` };
      setRec(r);
      setState("done");
      onReady(r);
    };
    media.current = recorder;
    timers.current.started = Date.now();
    setElapsed(0);
    timers.current.tick = window.setInterval(() => setElapsed(Date.now() - timers.current.started), 200);
    timers.current.cap = window.setTimeout(() => recorder.state === "recording" && recorder.stop(), MAX_SECONDS * 1000);
    recorder.start();
    setRec(null);
    onReady(null);
    setState("recording");
  }

  function stop() {
    if (media.current?.state === "recording") media.current.stop();
  }

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap items-center gap-4">
        {state === "recording" ? (
          <button
            onClick={stop}
            className="flex size-16 items-center justify-center rounded-full bg-red-600 text-white shadow-card"
            aria-label="Stop recording"
          >
            <span className="size-5 rounded-sm bg-white" />
          </button>
        ) : (
          <button
            onClick={start}
            disabled={disabled}
            className="flex size-16 items-center justify-center rounded-full bg-accent text-white shadow-card disabled:opacity-40"
            aria-label={state === "done" ? "Record again" : "Start recording"}
          >
            <span className="size-5 rounded-full bg-white" />
          </button>
        )}
        <div aria-live="polite" className="text-sm">
          {state === "recording" && (
            <p className="font-semibold text-red-600 tabular-nums">
              ● Recording {(elapsed / 1000).toFixed(1)} / {MAX_SECONDS} s
            </p>
          )}
          {state === "idle" && <p className="text-muted">Press to record (up to {MAX_SECONDS} seconds).</p>}
          {state === "done" && <p className="text-muted">Listen back. Press the button again to re-record.</p>}
        </div>
      </div>
      {state === "recording" && (
        <div className="h-1.5 overflow-hidden rounded-full bg-bg-sunken">
          <div className="h-full bg-red-600 transition-[width]" style={{ width: `${Math.min(100, elapsed / (MAX_SECONDS * 10))}%` }} />
        </div>
      )}
      {rec && state === "done" && <audio controls src={rec.url} className="w-full" />}
      {state === "done" && (
        <Button variant="secondary" onClick={() => { setRec(null); setState("idle"); onReady(null); }}>
          Discard
        </Button>
      )}
    </div>
  );
}
