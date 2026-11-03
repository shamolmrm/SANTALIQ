/**
 * On-screen keyboard layouts for the five Santali scripts.
 * Indic layouts are generated from the shared ISCII offsets used by the engine.
 */
import type { Script } from "./engine";

export type KeyGroup = { label: string; keys: Array<{ char: string; hint?: string }> };

const OL_LETTERS = "ᱚᱟᱤᱩᱮᱳ ᱠᱜᱝᱪᱡᱧᱴᱰᱬᱛᱫᱱᱯᱵᱢᱭᱨᱲᱞᱣᱶᱥᱦᱷ";
const OL_ROMAN: Record<string, string> = {
  ᱚ: "o", ᱟ: "a", ᱤ: "i", ᱩ: "u", ᱮ: "e", ᱳ: "ō", ᱠ: "k", ᱜ: "g", ᱝ: "ŋ", ᱪ: "c", ᱡ: "j", ᱧ: "ñ",
  ᱴ: "ṭ", ᱰ: "ḍ", ᱬ: "ṇ", ᱛ: "t", ᱫ: "d", ᱱ: "n", ᱯ: "p", ᱵ: "b", ᱢ: "m", ᱭ: "y", ᱨ: "r", ᱲ: "ṛ",
  ᱞ: "l", ᱣ: "w", ᱶ: "v", ᱥ: "s", ᱦ: "h", ᱷ: "ʰ",
};

function olChiki(): KeyGroup[] {
  const [vowels, consonants] = OL_LETTERS.split(" ");
  const keys = (s: string) => Array.from(s).map((c) => ({ char: c, hint: OL_ROMAN[c] }));
  return [
    { label: "Vowels", keys: keys(vowels) },
    { label: "Consonants", keys: keys(consonants) },
    {
      label: "Marks",
      keys: [
        { char: "ᱸ", hint: "nasal" },
        { char: "ᱹ", hint: "gaahlaa" },
        { char: "ᱺ", hint: "mu-gaahlaa" },
        { char: "ᱻ", hint: "relaa" },
        { char: "ᱼ", hint: "phaarkaa" },
        { char: "ᱽ", hint: "ahad" },
        { char: "᱾", hint: "." },
        { char: "᱿", hint: "‖" },
      ],
    },
    { label: "Digits", keys: Array.from("᱐᱑᱒᱓᱔᱕᱖᱗᱘᱙").map((c, i) => ({ char: c, hint: String(i) })) },
  ];
}

const INDIC_BASE: Record<"beng" | "orya" | "deva", number> = { deva: 0x0900, beng: 0x0980, orya: 0x0b00 };

function indic(script: "beng" | "orya" | "deva"): KeyGroup[] {
  const base = INDIC_BASE[script];
  const at = (off: number) => String.fromCodePoint(base + off);
  const range = (offs: number[]) => offs.map((o) => ({ char: at(o) }));
  const consonants = range([
    0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23,
    0x24, 0x25, 0x26, 0x27, 0x28, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e, 0x2f, 0x30, 0x32, 0x38, 0x39,
  ]);
  // y-sound, w, and rr letters used for Santali
  const extra =
    script === "beng"
      ? ["য়", "ৱ", "ড়", "ঢ়"]
      : script === "orya"
        ? ["ୟ", "ୱ", "ଡ଼", "ଢ଼"]
        : ["य़", "व", "ड़", "ढ़"];
  return [
    { label: "Vowels", keys: range([0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0f, 0x10, 0x13, 0x14]) },
    { label: "Consonants", keys: [...consonants, ...extra.map((c) => ({ char: c }))] },
    {
      label: "Signs",
      keys: [
        ...[0x3e, 0x3f, 0x40, 0x41, 0x42, 0x47, 0x48, 0x4b, 0x4c].map((o) => ({ char: at(o), hint: "◌" })),
        { char: at(0x4d), hint: "virama" },
        { char: at(0x01), hint: "nasal" },
        { char: at(0x02), hint: "anusvara" },
        { char: at(0x3c), hint: "nukta" },
        { char: "।", hint: "danda" },
      ],
    },
    { label: "Digits", keys: Array.from({ length: 10 }, (_, i) => ({ char: at(0x66 + i), hint: String(i) })) },
  ];
}

function roman(): KeyGroup[] {
  return [
    {
      label: "Santali letters",
      keys: ["ṭ", "ḍ", "ṇ", "ṛ", "ñ", "ŋ", "ō", "ạ", "ẹ", "ị", "ọ", "ụ"].map((c) => ({ char: c })),
    },
    {
      label: "Marks",
      keys: [
        { char: "̃", hint: "nasal ~" },
        { char: "̣", hint: "dot below" },
        { char: "'", hint: "glottal" },
      ],
    },
  ];
}

export function keyboardLayout(script: Script): KeyGroup[] {
  if (script === "olck") return olChiki();
  if (script === "latn") return roman();
  return indic(script);
}
