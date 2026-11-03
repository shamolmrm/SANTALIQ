import assert from "node:assert/strict";
import { test } from "node:test";
import { SCRIPTS } from "./engine.ts";
import { keyboardLayout } from "./keyboard.ts";

test("every script has a keyboard with unique, non-empty keys", () => {
  for (const s of SCRIPTS) {
    const keys = keyboardLayout(s).flatMap((g) => g.keys.map((k) => k.char));
    assert.ok(keys.length > 5, s);
    assert.equal(new Set(keys).size, keys.length, `duplicate keys in ${s}`);
    for (const k of keys) assert.ok(k.length > 0);
  }
});

test("Ol Chiki keyboard covers all 30 letters", () => {
  const letters = keyboardLayout("olck")
    .filter((g) => g.label === "Vowels" || g.label === "Consonants")
    .flatMap((g) => g.keys);
  assert.equal(letters.length, 30);
});

test("Indic keyboards use their own Unicode block", () => {
  const ranges = { beng: [0x0980, 0x09ff], orya: [0x0b00, 0x0b7f], deva: [0x0900, 0x097f] } as const;
  for (const [s, [lo, hi]] of Object.entries(ranges)) {
    const consonants = keyboardLayout(s as "beng").find((g) => g.label === "Consonants")!.keys;
    for (const k of consonants) {
      const cp = k.char.codePointAt(0)!;
      assert.ok(cp >= lo && cp <= hi, `${s}: ${k.char}`);
    }
  }
});
