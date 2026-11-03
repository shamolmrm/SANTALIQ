import assert from "node:assert/strict";
import { test } from "node:test";
import { fill, MESSAGES } from "./messages.ts";

function leaves(obj: Record<string, unknown>, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") out.set(prefix + k, v);
    if (typeof v !== "string") for (const [kk, vv] of leaves(v as Record<string, unknown>, `${prefix}${k}.`)) out.set(kk, vv);
  }
  return out;
}

test("Bengali has every English key, none empty, same placeholders", () => {
  const en = leaves(MESSAGES.en);
  const bn = leaves(MESSAGES.bn);
  assert.deepEqual([...bn.keys()].sort(), [...en.keys()].sort());
  for (const [k, v] of en) {
    const b = bn.get(k)!;
    assert.ok(b.trim(), `empty bn: ${k}`);
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    assert.deepEqual(ph(b), ph(v), `placeholders differ: ${k}`);
  }
});

test("fill replaces placeholders", () => {
  assert.equal(fill("Speak in {lang}", { lang: "Hindi" }), "Speak in Hindi");
  assert.equal(fill("{x} stays", {}), "{x} stays");
});
