/**
 * SANTALIQ script engine — converts Santali text between the scripts it is written in.
 *
 * Pivot design: every script converts to Ol Chiki first, then out to the target script.
 * Bengali, Odia and Devanagari share the same Unicode layout (ISCII heritage), so one
 * offset table drives all three.
 *
 * STATUS: DRAFT RULES. Mappings follow Unicode letter values and common practice but are
 * awaiting review by native Santali speakers. Known open questions are listed in
 * docs/modules/SCRIPT-CONVERTER.md. Do not treat output as authoritative.
 *
 * Only erasable TypeScript syntax is used so `node --test` can run this file directly.
 */

export const SCRIPTS = ["olck", "latn", "beng", "orya", "deva"] as const;
export type Script = (typeof SCRIPTS)[number];
type IndicScript = "beng" | "orya" | "deva";

export const SCRIPT_LABELS: Record<Script, { name: string; native: string }> = {
  olck: { name: "Ol Chiki", native: "ᱚᱞ ᱪᱤᱠᱤ" },
  latn: { name: "Roman", native: "Roman" },
  beng: { name: "Bengali", native: "বাংলা" },
  orya: { name: "Odia", native: "ଓଡ଼ିଆ" },
  deva: { name: "Devanagari", native: "देवनागरी" },
};

// ───────────────────────── Ol Chiki inventory ─────────────────────────

const OL = {
  LA: "ᱚ", AT: "ᱛ", AG: "ᱜ", ANG: "ᱝ", AL: "ᱞ", LAA: "ᱟ", AAK: "ᱠ", AAJ: "ᱡ", AAM: "ᱢ",
  AAW: "ᱣ", LI: "ᱤ", IS: "ᱥ", IH: "ᱦ", INY: "ᱧ", IR: "ᱨ", LU: "ᱩ", UC: "ᱪ", UD: "ᱫ",
  UNN: "ᱬ", UY: "ᱭ", LE: "ᱮ", EP: "ᱯ", EDD: "ᱰ", EN: "ᱱ", ERR: "ᱲ", LO: "ᱳ", OTT: "ᱴ",
  OB: "ᱵ", OV: "ᱶ", OH: "ᱷ",
  MU_TTUDDAG: "ᱸ", GAAHLAA: "ᱹ", MU_GAAHLAA: "ᱺ", RELAA: "ᱻ", PHAARKAA: "ᱼ", AHAD: "ᱽ",
  MUCAAD: "᱾", DOUBLE_MUCAAD: "᱿",
} as const;

const OL_VOWELS = new Set<string>([OL.LA, OL.LAA, OL.LI, OL.LU, OL.LE, OL.LO]);
const OL_CONSONANTS = new Set<string>([
  OL.AT, OL.AG, OL.ANG, OL.AL, OL.AAK, OL.AAJ, OL.AAM, OL.AAW, OL.IS, OL.IH, OL.INY, OL.IR,
  OL.UC, OL.UD, OL.UNN, OL.UY, OL.EP, OL.EDD, OL.EN, OL.ERR, OL.OTT, OL.OB, OL.OV,
]);
const OL_DIGIT_ZERO = 0x1c50;

// ───────────────────────── Indic (Bengali / Odia / Devanagari) ─────────────────────────

const INDIC_BASE: Record<IndicScript, number> = { deva: 0x0900, beng: 0x0980, orya: 0x0b00 };
const VIRAMA = 0x4d;
const NUKTA = 0x3c;
const CHANDRABINDU = 0x01;
const ANUSVARA = 0x02;
const DANDA = "।";
const DOUBLE_DANDA = "॥";

/** Ol Chiki consonant → Indic offset (relative to the script block). */
const OL_TO_INDIC_CONS: Record<string, number> = {
  [OL.AAK]: 0x15, [OL.AG]: 0x17, [OL.ANG]: 0x19, [OL.UC]: 0x1a, [OL.AAJ]: 0x1c, [OL.INY]: 0x1e,
  [OL.OTT]: 0x1f, [OL.EDD]: 0x21, [OL.UNN]: 0x23, [OL.AT]: 0x24, [OL.UD]: 0x26, [OL.EN]: 0x28,
  [OL.EP]: 0x2a, [OL.OB]: 0x2c, [OL.AAM]: 0x2e, [OL.IR]: 0x30, [OL.AL]: 0x32, [OL.OV]: 0x35,
  [OL.IS]: 0x38, [OL.IH]: 0x39,
};
/** Aspirated forms: Ol Chiki consonant + ᱷ → Indic offset. */
const OL_ASPIRATED: Record<string, number> = {
  [OL.AAK]: 0x16, [OL.AG]: 0x18, [OL.UC]: 0x1b, [OL.AAJ]: 0x1d, [OL.OTT]: 0x20, [OL.EDD]: 0x22,
  [OL.AT]: 0x25, [OL.UD]: 0x27, [OL.EP]: 0x2b, [OL.OB]: 0x2d,
};
const OL_TO_INDIC_INDEPENDENT: Record<string, number> = {
  [OL.LA]: 0x05, [OL.LAA]: 0x06, [OL.LI]: 0x07, [OL.LU]: 0x09, [OL.LE]: 0x0f, [OL.LO]: 0x13,
};
/** Vowel signs; ᱚ is the inherent vowel and has no sign. */
const OL_TO_INDIC_MATRA: Record<string, number | null> = {
  [OL.LA]: null, [OL.LAA]: 0x3e, [OL.LI]: 0x3f, [OL.LU]: 0x41, [OL.LE]: 0x47, [OL.LO]: 0x4b,
};

const ch = (script: IndicScript, offset: number) => String.fromCodePoint(INDIC_BASE[script] + offset);

/** Letters that are not a simple offset in every script. */
function indicConsonant(script: IndicScript, ol: string, aspirated: boolean): string {
  if (ol === OL.UY) {
    // y-sound: Odia has a dedicated letter; Bengali/Devanagari use YA + NUKTA.
    if (script === "orya") return "ୟ";
    if (script === "beng") return ch(script, 0x2f) + ch(script, NUKTA);
    return ch(script, 0x2f);
  }
  if (ol === OL.AAW) {
    if (script === "beng") return "ৰ"; // ৱ
    if (script === "orya") return "ୱ"; // ୱ
    return ch(script, 0x35); // व
  }
  if (ol === OL.ERR) {
    return ch(script, aspirated ? 0x22 : 0x21) + ch(script, NUKTA); // ड़ / ढ़ and equivalents
  }
  if (aspirated && OL_ASPIRATED[ol] !== undefined) return ch(script, OL_ASPIRATED[ol]);
  const base = ch(script, OL_TO_INDIC_CONS[ol]);
  // No aspirated letter exists: write consonant + virama + HA.
  return aspirated ? base + ch(script, VIRAMA) + ch(script, 0x39) : base;
}

function olToIndic(text: string, script: IndicScript): string {
  const chars = Array.from(text);
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (OL_CONSONANTS.has(c)) {
      let aspirated = false;
      if (chars[i + 1] === OL.OH) {
        aspirated = true;
        i++;
      }
      out += indicConsonant(script, c, aspirated);
      const next = chars[i + 1];
      if (next !== undefined && OL_VOWELS.has(next)) {
        const matra = OL_TO_INDIC_MATRA[next];
        if (matra !== null) out += ch(script, matra);
        i++;
      } else if (next !== undefined && OL_CONSONANTS.has(next)) {
        out += ch(script, VIRAMA); // cluster
      }
      continue;
    }
    if (OL_VOWELS.has(c)) {
      out += ch(script, OL_TO_INDIC_INDEPENDENT[c]);
      continue;
    }
    if (c === OL.MU_TTUDDAG || c === OL.MU_GAAHLAA) {
      out += ch(script, CHANDRABINDU);
      continue;
    }
    if (c === OL.GAAHLAA || c === OL.RELAA || c === OL.PHAARKAA || c === OL.AHAD) continue; // no Indic equivalent yet
    if (c === OL.OH) {
      out += ch(script, 0x39);
      continue;
    }
    if (c === OL.MUCAAD) {
      out += DANDA;
      continue;
    }
    if (c === OL.DOUBLE_MUCAAD) {
      out += DOUBLE_DANDA;
      continue;
    }
    const cp = c.codePointAt(0)!;
    if (cp >= OL_DIGIT_ZERO && cp <= OL_DIGIT_ZERO + 9) {
      out += ch(script, 0x66 + (cp - OL_DIGIT_ZERO));
      continue;
    }
    out += c;
  }
  return out;
}

/** Indic offset → Ol Chiki, built from the forward tables plus fallbacks. */
const INDIC_CONS_TO_OL: Record<number, string> = {
  0x15: OL.AAK, 0x16: OL.AAK + OL.OH, 0x17: OL.AG, 0x18: OL.AG + OL.OH, 0x19: OL.ANG,
  0x1a: OL.UC, 0x1b: OL.UC + OL.OH, 0x1c: OL.AAJ, 0x1d: OL.AAJ + OL.OH, 0x1e: OL.INY,
  0x1f: OL.OTT, 0x20: OL.OTT + OL.OH, 0x21: OL.EDD, 0x22: OL.EDD + OL.OH, 0x23: OL.UNN,
  0x24: OL.AT, 0x25: OL.AT + OL.OH, 0x26: OL.UD, 0x27: OL.UD + OL.OH, 0x28: OL.EN,
  0x2a: OL.EP, 0x2b: OL.EP + OL.OH, 0x2c: OL.OB, 0x2d: OL.OB + OL.OH, 0x2e: OL.AAM,
  0x30: OL.IR, 0x32: OL.AL, 0x35: OL.AAW, 0x36: OL.IS, 0x37: OL.IS, 0x38: OL.IS, 0x39: OL.IH,
  0x5c: OL.ERR, 0x5d: OL.ERR + OL.OH, 0x5f: OL.UY,
};
const INDIC_INDEPENDENT_TO_OL: Record<number, string> = {
  0x05: OL.LA, 0x06: OL.LAA, 0x07: OL.LI, 0x08: OL.LI, 0x09: OL.LU, 0x0a: OL.LU,
  0x0f: OL.LE, 0x10: OL.LAA + OL.LI, 0x13: OL.LO, 0x14: OL.LAA + OL.LU,
};
const INDIC_MATRA_TO_OL: Record<number, string> = {
  0x3e: OL.LAA, 0x3f: OL.LI, 0x40: OL.LI, 0x41: OL.LU, 0x42: OL.LU, 0x47: OL.LE,
  0x48: OL.LAA + OL.LI, 0x4b: OL.LO, 0x4c: OL.LAA + OL.LU,
};

function indicOffset(c: string | undefined, script: IndicScript): number | null {
  if (c === undefined) return null;
  const off = c.codePointAt(0)! - INDIC_BASE[script];
  return off >= 0 && off < 0x80 ? off : null;
}

function indicConsonantToOl(c: string, next: string | undefined, script: IndicScript): [string, number] | null {
  if (script === "beng" && c === "ৰ") return [OL.AAW, 0];
  if (script === "orya" && c === "ୱ") return [OL.AAW, 0];
  const off = indicOffset(c, script);
  if (off === null) return null;
  const hasNukta = indicOffset(next, script) === NUKTA;
  if (hasNukta) {
    if (off === 0x21) return [OL.ERR, 1];
    if (off === 0x22) return [OL.ERR + OL.OH, 1];
    if (off === 0x2f) return [OL.UY, 1];
  }
  if (off === 0x2f) {
    // Plain YA: pronounced /j/ in Bengali and Odia, /y/ in Devanagari.
    return [script === "deva" ? OL.UY : OL.AAJ, hasNukta ? 1 : 0];
  }
  const ol = INDIC_CONS_TO_OL[off];
  return ol === undefined ? null : [ol, hasNukta ? 1 : 0];
}

function isIndicLetter(c: string | undefined, script: IndicScript): boolean {
  if (c === undefined) return false;
  if (c === "ৰ" || c === "ୱ") return true;
  const off = indicOffset(c, script);
  return off !== null && (INDIC_CONS_TO_OL[off] !== undefined || INDIC_INDEPENDENT_TO_OL[off] !== undefined || off === 0x2f);
}

function indicToOl(text: string, script: IndicScript): string {
  const chars = Array.from(text);
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const cons = indicConsonantToOl(c, chars[i + 1], script);
    if (cons) {
      out += cons[0];
      i += cons[1];
      const nextOff = indicOffset(chars[i + 1], script);
      if (nextOff !== null && INDIC_MATRA_TO_OL[nextOff] !== undefined) {
        out += INDIC_MATRA_TO_OL[nextOff];
        i++;
      } else if (nextOff === VIRAMA) {
        i++;
      } else if (isIndicLetter(chars[i + 1], script)) {
        out += OL.LA; // inherent vowel inside a word; dropped at word end
      }
      continue;
    }
    const off = indicOffset(c, script);
    if (off !== null) {
      if (INDIC_INDEPENDENT_TO_OL[off] !== undefined) {
        out += INDIC_INDEPENDENT_TO_OL[off];
        continue;
      }
      if (off === CHANDRABINDU) {
        out += OL.MU_TTUDDAG;
        continue;
      }
      if (off === ANUSVARA) {
        out += OL.ANG;
        continue;
      }
      if (off >= 0x66 && off <= 0x6f) {
        out += String.fromCodePoint(OL_DIGIT_ZERO + off - 0x66);
        continue;
      }
      if (off === VIRAMA || off === NUKTA) continue;
    }
    if (c === DANDA) {
      out += OL.MUCAAD;
      continue;
    }
    if (c === DOUBLE_DANDA) {
      out += OL.DOUBLE_MUCAAD;
      continue;
    }
    out += c;
  }
  return out;
}

// ───────────────────────── Roman ─────────────────────────

const COMBINING_DOT_BELOW = "̣";
const COMBINING_TILDE = "̃";
const COMBINING_MACRON = "̄";

const OL_TO_ROMAN: Record<string, string> = {
  [OL.LA]: "o", [OL.AT]: "t", [OL.AG]: "g", [OL.ANG]: "ŋ", [OL.AL]: "l", [OL.LAA]: "a",
  [OL.AAK]: "k", [OL.AAJ]: "j", [OL.AAM]: "m", [OL.AAW]: "w", [OL.LI]: "i", [OL.IS]: "s",
  [OL.IH]: "h", [OL.INY]: "ñ", [OL.IR]: "r", [OL.LU]: "u", [OL.UC]: "c", [OL.UD]: "d",
  [OL.UNN]: "ṇ", [OL.UY]: "y", [OL.LE]: "e", [OL.EP]: "p", [OL.EDD]: "ḍ", [OL.EN]: "n",
  [OL.ERR]: "ṛ", [OL.LO]: "ō", [OL.OTT]: "ṭ", [OL.OB]: "b", [OL.OV]: "v", [OL.OH]: "h",
  [OL.MU_TTUDDAG]: COMBINING_TILDE, [OL.GAAHLAA]: COMBINING_DOT_BELOW,
  [OL.MU_GAAHLAA]: COMBINING_DOT_BELOW + COMBINING_TILDE, [OL.MUCAAD]: ".", [OL.DOUBLE_MUCAAD]: ".",
  [OL.RELAA]: "", [OL.PHAARKAA]: "", [OL.AHAD]: "",
};

function olToRoman(text: string): string {
  let out = "";
  for (const c of text) {
    const cp = c.codePointAt(0)!;
    if (cp >= OL_DIGIT_ZERO && cp <= OL_DIGIT_ZERO + 9) out += String(cp - OL_DIGIT_ZERO);
    else out += OL_TO_ROMAN[c] ?? c;
  }
  return out.normalize("NFC");
}

const ROMAN_BASE: Record<string, string> = {
  a: OL.LAA, e: OL.LE, i: OL.LI, u: OL.LU, o: OL.LA, k: OL.AAK, g: OL.AG, c: OL.UC, j: OL.AAJ,
  t: OL.AT, d: OL.UD, n: OL.EN, p: OL.EP, b: OL.OB, m: OL.AAM, y: OL.UY, r: OL.IR, l: OL.AL,
  w: OL.AAW, v: OL.OV, s: OL.IS, h: OL.IH, "ŋ": OL.ANG,
};
const ROMAN_RETROFLEX: Record<string, string> = { t: OL.OTT, d: OL.EDD, n: OL.UNN, r: OL.ERR };
/** Capital-letter keyboard shortcuts (ASCII-only typing). */
const ROMAN_CAPITAL_SHORTCUTS: Record<string, string> = { T: OL.OTT, D: OL.EDD, N: OL.UNN, R: OL.ERR, O: OL.LO };
const ASPIRABLE = new Set<string>([OL.AAK, OL.AG, OL.UC, OL.AAJ, OL.AT, OL.UD, OL.OTT, OL.EDD, OL.EP, OL.OB, OL.ERR]);
const ROMAN_VOWELS = new Set(["a", "e", "i", "u", "o"]);

export interface RomanOptions {
  /** Treat T, D, N, R, O as ṭ, ḍ, ṇ, ṛ, ō (keyboard mode). Default true. */
  capitalShortcuts?: boolean;
}

function romanToOl(text: string, options: RomanOptions = {}): string {
  const capitals = options.capitalShortcuts ?? true;
  const chars = Array.from(text.normalize("NFD"));
  let out = "";
  let last = ""; // last emitted Ol Chiki letter (for aspiration)
  for (let i = 0; i < chars.length; i++) {
    const raw = chars[i];
    if (capitals && ROMAN_CAPITAL_SHORTCUTS[raw]) {
      last = ROMAN_CAPITAL_SHORTCUTS[raw];
      out += last;
      continue;
    }
    const c = raw.toLowerCase();
    // collect combining marks that follow
    const marks: string[] = [];
    while (chars[i + 1] !== undefined && /\p{M}/u.test(chars[i + 1])) marks.push(chars[++i]);
    const has = (m: string) => marks.includes(m);

    if (c === "h" && marks.length === 0 && ASPIRABLE.has(last)) {
      out += OL.OH;
      last = OL.OH;
      continue;
    }
    if (c === "n" && marks.length === 0) {
      const nxt = chars[i + 1]?.toLowerCase();
      if (nxt === "g") {
        out += OL.ANG;
        last = OL.ANG;
        i++;
        continue;
      }
      if (nxt === "y") {
        out += OL.INY;
        last = OL.INY;
        i++;
        continue;
      }
    }
    let ol: string | undefined;
    if (c === "n" && has(COMBINING_TILDE)) ol = OL.INY;
    else if (c === "o" && has(COMBINING_MACRON)) ol = OL.LO;
    else if (ROMAN_RETROFLEX[c] && has(COMBINING_DOT_BELOW)) ol = ROMAN_RETROFLEX[c];
    else ol = ROMAN_BASE[c];

    if (ol === undefined) {
      if (c === "~" && OL_VOWELS.has(last)) {
        out += OL.MU_TTUDDAG;
        continue;
      }
      if (/[0-9]/.test(c)) out += String.fromCodePoint(OL_DIGIT_ZERO + Number(c));
      else if (c === ".") out += OL.MUCAAD;
      else out += raw + marks.join("");
      last = "";
      continue;
    }
    out += ol;
    last = ol;
    if (ROMAN_VOWELS.has(c)) {
      const dot = has(COMBINING_DOT_BELOW);
      const nasal = has(COMBINING_TILDE);
      if (dot && nasal) out += OL.MU_GAAHLAA;
      else if (dot) out += OL.GAAHLAA;
      else if (nasal) out += OL.MU_TTUDDAG;
    }
  }
  return out;
}

// ───────────────────────── Public API ─────────────────────────

const RANGES: Array<[Script, number, number]> = [
  ["olck", 0x1c50, 0x1c7f],
  ["deva", 0x0900, 0x097f],
  ["beng", 0x0980, 0x09ff],
  ["orya", 0x0b00, 0x0b7f],
];

/** Guess the script of a text from its letters. Falls back to Roman. */
export function detectScript(text: string): Script {
  const counts: Partial<Record<Script, number>> = {};
  for (const c of text) {
    const cp = c.codePointAt(0)!;
    const hit = RANGES.find(([, lo, hi]) => cp >= lo && cp <= hi);
    if (hit) counts[hit[0]] = (counts[hit[0]] ?? 0) + 1;
    else if (/[a-zA-Z]/.test(c)) counts.latn = (counts.latn ?? 0) + 1;
  }
  let best: Script = "latn";
  let max = 0;
  for (const s of SCRIPTS) {
    if ((counts[s] ?? 0) > max) {
      max = counts[s]!;
      best = s;
    }
  }
  return best;
}

export function toOlChiki(text: string, from: Script, options?: RomanOptions): string {
  switch (from) {
    case "olck":
      return text;
    case "latn":
      return romanToOl(text, options);
    default:
      return indicToOl(text, from);
  }
}

export function fromOlChiki(text: string, to: Script): string {
  switch (to) {
    case "olck":
      return text;
    case "latn":
      return olToRoman(text);
    default:
      return olToIndic(text, to);
  }
}

/** Convert Santali text from one script to another (via Ol Chiki). */
export function convert(text: string, from: Script, to: Script, options?: RomanOptions): string {
  if (from === to) return text;
  return fromOlChiki(toOlChiki(text, from, options), to);
}
