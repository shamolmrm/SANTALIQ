/**
 * Ol Chiki learning data. Letters, order and names come from the Unicode Standard (block U+1C50–U+1C7F).
 * The Roman "sound" column uses SANTALIQ's draft romanization (see docs/modules/SCRIPT-CONVERTER.md) and is
 * awaiting native-speaker review.
 */

export type Letter = { char: string; name: string; roman: string; vowel: boolean; row: number };

// Unicode order: six rows of five; each row starts with a vowel.
const ROWS: Array<Array<[string, string, string]>> = [
  [["ᱚ", "LA", "o"], ["ᱛ", "AT", "t"], ["ᱜ", "AG", "g"], ["ᱝ", "ANG", "ŋ"], ["ᱞ", "AL", "l"]],
  [["ᱟ", "LAA", "a"], ["ᱠ", "AAK", "k"], ["ᱡ", "AAJ", "j"], ["ᱢ", "AAM", "m"], ["ᱣ", "AAW", "w"]],
  [["ᱤ", "LI", "i"], ["ᱥ", "IS", "s"], ["ᱦ", "IH", "h"], ["ᱧ", "INY", "ñ"], ["ᱨ", "IR", "r"]],
  [["ᱩ", "LU", "u"], ["ᱪ", "UC", "c"], ["ᱫ", "UD", "d"], ["ᱬ", "UNN", "ṇ"], ["ᱭ", "UY", "y"]],
  [["ᱮ", "LE", "e"], ["ᱯ", "EP", "p"], ["ᱰ", "EDD", "ḍ"], ["ᱱ", "EN", "n"], ["ᱲ", "ERR", "ṛ"]],
  [["ᱳ", "LO", "ō"], ["ᱴ", "OTT", "ṭ"], ["ᱵ", "OB", "b"], ["ᱶ", "OV", "v"], ["ᱷ", "OH", "h (aspiration)"]],
];

export const LETTERS: Letter[] = ROWS.flatMap((row, r) =>
  row.map(([char, name, roman], i) => ({ char, name, roman, vowel: i === 0, row: r })),
);

export const DIGITS = Array.from("᱐᱑᱒᱓᱔᱕᱖᱗᱘᱙").map((char, value) => ({ char, value }));

export const MARKS: Array<{ char: string; name: string; use: string }> = [
  { char: "ᱸ", name: "MU TTUDDAG", use: "nasalization" },
  { char: "ᱹ", name: "GAAHLAA TTUDDAAG", use: "vowel modifier" },
  { char: "ᱺ", name: "MU-GAAHLAA TTUDDAAG", use: "nasalization + vowel modifier" },
  { char: "ᱻ", name: "RELAA", use: "length mark" },
  { char: "ᱼ", name: "PHAARKAA", use: "glottal protector" },
  { char: "ᱽ", name: "AHAD", use: "deglottalization" },
  { char: "᱾", name: "MUCAAD", use: "full stop" },
  { char: "᱿", name: "DOUBLE MUCAAD", use: "double full stop" },
];

export type QuizKind = "letter-to-sound" | "sound-to-letter" | "digit-to-value";
export type Question = { prompt: string; promptIsGlyph: boolean; options: string[]; answer: string; optionsAreGlyphs: boolean };

/** Deterministic shuffle when a seeded random is given (tests), Math.random otherwise. */
function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeQuiz(kind: QuizKind, count = 10, rand: () => number = Math.random): Question[] {
  if (kind === "digit-to-value") {
    return shuffle(DIGITS, rand)
      .slice(0, count)
      .map((d) => {
        const wrong = shuffle(DIGITS.filter((x) => x.value !== d.value), rand).slice(0, 3);
        return {
          prompt: d.char,
          promptIsGlyph: true,
          answer: String(d.value),
          options: shuffle([d, ...wrong], rand).map((x) => String(x.value)),
          optionsAreGlyphs: false,
        };
      });
  }
  // Skip ᱷ (a modifier, not a standalone sound) and the duplicate "h" sound to keep answers unambiguous.
  const pool = LETTERS.filter((l) => l.name !== "OH");
  return shuffle(pool, rand)
    .slice(0, count)
    .map((l) => {
      const wrong = shuffle(pool.filter((x) => x.char !== l.char && x.roman !== l.roman), rand).slice(0, 3);
      const options = shuffle([l, ...wrong], rand);
      return kind === "letter-to-sound"
        ? { prompt: l.char, promptIsGlyph: true, answer: l.roman, options: options.map((x) => x.roman), optionsAreGlyphs: false }
        : { prompt: l.roman, promptIsGlyph: false, answer: l.char, options: options.map((x) => x.char), optionsAreGlyphs: true };
    });
}
