"use client";

import { useEffect, useState } from "react";
import { makeQuiz, type Question, type QuizKind } from "@/lib/learn/olchiki";

const KINDS: Array<{ id: QuizKind; title: string; hint: string }> = [
  { id: "letter-to-sound", title: "Letter → sound", hint: "See an Ol Chiki letter, pick its sound." },
  { id: "sound-to-letter", title: "Sound → letter", hint: "See a sound, pick the Ol Chiki letter." },
  { id: "digit-to-value", title: "Digits", hint: "Read Ol Chiki numbers." },
];

const BEST_KEY = "santaliq.learn.best";

function loadBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function Quiz() {
  const [kind, setKind] = useState<QuizKind | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<Record<string, number>>({});

  // eslint-disable-next-line react-hooks/set-state-in-effect -- read per-browser best scores after mount
  useEffect(() => setBest(loadBest()), []);

  function start(k: QuizKind) {
    setKind(k);
    setQuestions(makeQuiz(k));
    setIndex(0);
    setPicked(null);
    setScore(0);
  }

  function choose(option: string) {
    if (picked) return;
    setPicked(option);
    if (option === questions[index].answer) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setPicked(null);
      return;
    }
    const final = score;
    const updated = { ...best, [kind!]: Math.max(best[kind!] ?? 0, final) };
    setBest(updated);
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify(updated));
    } catch {
      /* storage unavailable */
    }
    setIndex(questions.length);
  }

  if (!kind)
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => start(k.id)}
            className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40"
          >
            <p className="text-lg font-bold">{k.title}</p>
            <p className="mt-1 text-sm text-muted">{k.hint}</p>
            <p className="mt-4 text-xs text-muted">{best[k.id] !== undefined ? `Best: ${best[k.id]}/10` : "Not tried yet"}</p>
          </button>
        ))}
      </div>
    );

  if (index >= questions.length)
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-8 text-center shadow-card">
        <p className="text-sm text-muted">{KINDS.find((k) => k.id === kind)?.title}</p>
        <p className="mt-2 font-display text-5xl font-bold">{score}/10</p>
        <p className="mt-2 text-muted">{score === 10 ? "Perfect score!" : score >= 7 ? "Great work — keep practising." : "Good start — try again."}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => start(kind)} className="rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-bg">
            Try again
          </button>
          <button onClick={() => setKind(null)} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold">
            Other quizzes
          </button>
        </div>
      </div>
    );

  const q = questions[index];
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-bg-elevated p-6 shadow-card sm:p-8">
      <div className="flex items-center justify-between text-sm text-muted">
        <button onClick={() => setKind(null)} className="hover:text-fg">
          ← Quizzes
        </button>
        <span>
          Question {index + 1}/{questions.length} · Score {score}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-sunken">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>

      <p className={`mt-8 text-center ${q.promptIsGlyph ? "font-[family-name:var(--font-olchiki)] text-8xl" : "text-5xl font-bold"}`}>{q.prompt}</p>

      <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-3">
        {q.options.map((o) => {
          const state = !picked ? "idle" : o === q.answer ? "right" : o === picked ? "wrong" : "idle";
          return (
            <button
              key={o}
              onClick={() => choose(o)}
              disabled={!!picked}
              className={`rounded-xl border py-4 transition-colors ${q.optionsAreGlyphs ? "font-[family-name:var(--font-olchiki)] text-4xl" : "text-2xl font-semibold"} ${
                state === "right"
                  ? "border-accent bg-accent text-white"
                  : state === "wrong"
                    ? "border-red-500 bg-red-500/10 text-red-600"
                    : "border-line bg-bg hover:border-accent/50"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="mt-6 text-center">
          <p className={picked === q.answer ? "font-semibold text-accent" : "font-semibold text-red-600"}>
            {picked === q.answer ? "Correct!" : `Answer: ${q.answer}`}
          </p>
          <button onClick={next} className="mt-4 rounded-full bg-fg px-6 py-2.5 text-sm font-semibold text-bg">
            {index + 1 < questions.length ? "Next" : "See result"}
          </button>
        </div>
      )}
    </div>
  );
}
