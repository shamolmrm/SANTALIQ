import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { BN } from "./phrases.ts";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== "i18n") yield* sourceFiles(p); // skip the i18n module (its doc comments show examples)
    }
    else if (/\.tsx?$/.test(name) && !name.endsWith(".test.ts")) yield p;
  }
}

test("every tr()/<Tr> phrase in the code has a Bengali translation", () => {
  const missing = new Set<string>();
  for (const file of sourceFiles(SRC)) {
    const code = readFileSync(file, "utf8");
    for (const m of code.matchAll(/\btr\((?:"((?:[^"\\]|\\.)*)")|<Tr s=\{"((?:[^"\\]|\\.)*)"\}/g)) {
      const phrase = JSON.parse(`"${m[1] ?? m[2]}"`) as string;
      if (!(phrase in BN)) missing.add(phrase);
    }
  }
  assert.deepEqual([...missing], [], `missing Bengali for: ${[...missing].join(" | ")}`);
});

test("no Bengali phrase is empty", () => {
  for (const [en, bn] of Object.entries(BN)) assert.ok(bn.trim(), `empty: ${en}`);
});
