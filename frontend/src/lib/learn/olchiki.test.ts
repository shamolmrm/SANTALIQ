import assert from "node:assert/strict";
import { test } from "node:test";
import { convert } from "../script/engine.ts";
import { DIGITS, LETTERS, makeQuiz, MARKS } from "./olchiki.ts";

test("30 letters in Unicode order, 6 vowels, unique", () => {
  assert.equal(LETTERS.length, 30);
  assert.equal(LETTERS.filter((l) => l.vowel).length, 6);
  assert.equal(new Set(LETTERS.map((l) => l.char)).size, 30);
  const cps = LETTERS.map((l) => l.char.codePointAt(0)!);
  assert.deepEqual(cps, [...cps].sort((a, b) => a - b));
  assert.equal(cps[0], 0x1c5a);
  assert.equal(cps[29], 0x1c77);
});

test("romanization column agrees with the converter", () => {
  for (const l of LETTERS.filter((x) => x.name !== "OH")) {
    assert.equal(convert(l.char, "olck", "latn"), l.roman, l.name);
  }
});

test("digits and marks", () => {
  assert.equal(DIGITS.length, 10);
  assert.equal(DIGITS[0].char.codePointAt(0), 0x1c50);
  assert.equal(MARKS.length, 8);
});

test("quizzes have 4 unique options including the answer", () => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const kind of ["letter-to-sound", "sound-to-letter", "digit-to-value"] as const) {
    const quiz = makeQuiz(kind, 10, rand);
    assert.equal(quiz.length, 10);
    for (const q of quiz) {
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options).size, 4);
      assert.ok(q.options.includes(q.answer));
    }
  }
});
