"use client";

import { useEffect, useRef, useState } from "react";
import { convert, detectScript, SCRIPT_LABELS, SCRIPTS, type Script } from "@/lib/script/engine";
import { fill, tr, useT } from "@/lib/i18n";
import { createRecognizer, recognitionSupported, speak, stopSpeaking, useVoices, voiceFor } from "@/lib/speech";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "";
const SANTALI = "sat_Beng";
const MAX = 2000;

type Language = { code: string; name: string; native: string; iso: string };
type Engine = { id: "nllb" | "google"; name: string; enabled: boolean; note: string; limit_reached?: boolean };

/** Render Santali text in all five scripts, whatever script it arrived in. */
function allScripts(text: string): Array<{ script: Script; text: string }> {
  const src = detectScript(text);
  return SCRIPTS.map((s) => ({ script: s, text: convert(text, src, s, { capitalShortcuts: false }) }));
}

function IconButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid size-10 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        active ? "bg-red-500/15 text-red-600 dark:text-red-400" : "text-muted hover:bg-bg-sunken hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

const MicIcon = () => (
  <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const SpeakerIcon = ({ on }: { on?: boolean }) => (
  <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H3v6h3l5 4z" />
    {on ? <path d="M15 9l6 6M21 9l-6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
  </svg>
);
const CopyIcon = () => (
  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

export function Translator() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);
  const [engine, setEngine] = useState<Engine["id"]>("nllb");
  const [source, setSource] = useState("eng_Latn");
  const [target, setTarget] = useState(SANTALI);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const recognizer = useRef<ReturnType<typeof createRecognizer>>(null);
  const voices = useVoices();
  const tAll = useT();
  const t = tAll.translator;
  const c = tAll.common;
  const [langError, setLangError] = useState(false);

  useEffect(() => {
    setMicSupported(recognitionSupported());
    fetch(`${API}/api/v1/translate/languages`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setLanguages)
      .catch(() => setLangError(true));
    fetch(`${API}/api/v1/translate/engines`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setEngines)
      .catch(() => setEngines([]));
    return () => {
      stopSpeaking();
      recognizer.current?.stop();
    };
  }, []);

  const iso = (code: string) => languages.find((l) => l.code === code)?.iso ?? "";
  const nameOf = (code: string) => languages.find((l) => l.code === code)?.name ?? code;

  async function translate(text = input) {
    const t = text.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    // Santali input may be typed in any script; the NLLB model reads Ol Chiki.
    const payload = source === SANTALI && engine === "nllb" ? convert(t, detectScript(t), "olck", { capitalShortcuts: false }) : t;
    try {
      const r = await fetch(`${API}/api/v1/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: payload, source, target, engine }),
      });
      if (!r.ok) {
        const detail = await r.json().then((b) => b.detail).catch(() => null);
        throw new Error(
          r.status === 429
            ? tAll.translator.errRate
            : typeof detail === "string"
              ? detail
              : tAll.translator.errFailed,
        );
      }
      const data: { translation: string } = await r.json();
      setOutput(data.translation);
    } catch (e) {
      setError(e instanceof Error ? e.message : tAll.translator.errFailed);
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    setSource(target);
    setTarget(source);
    setInput(output);
    setOutput("");
  }

  function toggleSpeak(id: string, text: string, langIso: string) {
    if (speaking === id) {
      stopSpeaking();
      setSpeaking(null);
      return;
    }
    const voice = voiceFor(voices, langIso);
    if (!voice || !text.trim()) return;
    setSpeaking(id);
    speak(text, voice, () => setSpeaking((s) => (s === id ? null : s)));
  }

  function toggleMic() {
    if (listening) {
      recognizer.current?.stop();
      return;
    }
    const r = createRecognizer(iso(source));
    if (!r) return;
    const base = input ? input.trimEnd() + " " : "";
    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setInput((base + text).slice(0, MAX));
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") setError(t.errMicDenied);
      else if (e.error === "language-not-supported") setError(fill(t.errMicLang, { lang: nameOf(source) }));
    };
    r.onend = () => setListening(false);
    recognizer.current = r;
    setListening(true);
    setError(null);
    r.start();
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  const santaliNote = t.santaliVoice;
  const speakLabel = (code: string, text: string) => {
    if (code === SANTALI) return santaliNote;
    if (!text.trim()) return t.listen;
    return voiceFor(voices, iso(code)) ? fill(t.listenIn, { lang: nameOf(code) }) : fill(t.noVoice, { lang: nameOf(code) });
  };
  const canSpeak = (code: string, text: string) => code !== SANTALI && !!text.trim() && !!voiceFor(voices, iso(code));
  const micLabel =
    source === SANTALI
      ? t.santaliMic
      : !micSupported
        ? t.micUnsupported
        : listening
          ? t.stopListening
          : fill(t.speakIn, { lang: nameOf(source) });

  const select = (value: string, onChange: (v: string) => void, label: string) => (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        setOutput("");
      }}
      className="w-full rounded-full border border-line bg-bg px-4 py-2 text-sm sm:w-auto"
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code}>
          {l.name}
          {l.native !== l.name ? ` — ${l.native}` : ""}
        </option>
      ))}
    </select>
  );

  const activeEngine = engines.find((e) => e.id === engine);

  const err = error ?? (langError ? t.errLanguages : null);

  return (
    <div className="space-y-5">
      {/* Engine switch */}
      {engines.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">{t.engine}</span>
          {engines.map((e) => (
            <button
              key={e.id}
              type="button"
              disabled={!e.enabled}
              onClick={() => {
                setEngine(e.id);
                setOutput("");
              }}
              title={e.enabled ? tr(e.note) : e.limit_reached ? tr("Free monthly limit reached — back next month") : `${e.name} — ${t.comingSoon}`}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                engine === e.id ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"
              }`}
            >
              {e.name}
              {!e.enabled && <span className="ml-1 text-xs">{e.limit_reached ? tr("(limit reached)") : t.soon}</span>}
            </button>
          ))}
          {activeEngine && <span className="text-xs text-muted">{tr(activeEngine.note)}</span>}
        </div>
      )}

      {/* Language bar */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {select(source, setSource, t.from)}
        <button type="button" onClick={swap} aria-label={t.swap} className="self-center rounded-full border border-line px-3 py-2 text-sm transition-colors hover:border-fg/40">
          ⇄
        </button>
        {select(target, setTarget, t.to)}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Input */}
        <div className="flex flex-col rounded-[var(--radius-card)] border border-line bg-bg-elevated">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) translate();
              }}
              rows={7}
              placeholder={source === SANTALI ? t.placeholderSantali : t.placeholder}
              aria-label={t.input}
              className="h-full w-full resize-none rounded-t-[var(--radius-card)] bg-transparent p-5 pr-12 text-xl leading-relaxed outline-none"
            />
            {input && (
              <button type="button" onClick={() => { setInput(""); setOutput(""); }} aria-label={c.clear} className="absolute top-4 right-4 text-xl text-muted hover:text-fg">
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 border-t border-line px-3 py-2">
            <IconButton label={micLabel} onClick={toggleMic} disabled={source === SANTALI || !micSupported} active={listening}>
              <MicIcon />
            </IconButton>
            <IconButton label={speakLabel(source, input)} onClick={() => toggleSpeak("in", input, iso(source))} disabled={!canSpeak(source, input)}>
              <SpeakerIcon on={speaking === "in"} />
            </IconButton>
            {listening && <span className="ml-1 animate-pulse text-sm text-red-600 dark:text-red-400">{t.listening}</span>}
            <span className="ml-auto text-xs text-muted">
              {input.length}/{MAX}
            </span>
            <button
              type="button"
              onClick={() => translate()}
              disabled={loading || !input.trim() || languages.length === 0}
              className="ml-3 rounded-full bg-fg px-6 py-2 font-semibold text-bg transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              {loading ? t.translating : t.translate}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col rounded-[var(--radius-card)] border border-line bg-bg-sunken" aria-live="polite">
          <div className="flex-1 p-5">
            {err && <p className="rounded-xl bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">{tr(err)}</p>}
            {!err && !output && <p className="text-xl text-muted">{loading ? t.translating : t.translation}</p>}
            {!err && output && target !== SANTALI && <p className="text-xl leading-relaxed whitespace-pre-wrap">{output}</p>}
            {!err && output && target === SANTALI && (
              <div className="divide-y divide-line">
                {allScripts(output).map(({ script, text }) => (
                  <div key={script} className="flex items-start gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex-1">
                      <span className="text-xs font-medium tracking-[0.15em] text-muted uppercase">
                        {SCRIPT_LABELS[script].name} · {SCRIPT_LABELS[script].native}
                      </span>
                      <p className="mt-1 text-xl leading-relaxed whitespace-pre-wrap">{text}</p>
                    </div>
                    <IconButton label={copied === script ? c.copied : c.copy} onClick={() => copy(script, text)}>
                      {copied === script ? "✓" : <CopyIcon />}
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
          </div>
          {output && !err && (
            <div className="flex items-center gap-1 border-t border-line px-3 py-2">
              <IconButton label={speakLabel(target, output)} onClick={() => toggleSpeak("out", output, iso(target))} disabled={!canSpeak(target, output)}>
                <SpeakerIcon on={speaking === "out"} />
              </IconButton>
              {target !== SANTALI && (
                <IconButton label={copied === "out" ? c.copied : c.copy} onClick={() => copy("out", output)}>
                  {copied === "out" ? "✓" : <CopyIcon />}
                </IconButton>
              )}
              {target === SANTALI && <span className="text-xs text-muted">{santaliNote}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
