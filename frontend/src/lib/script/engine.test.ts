import assert from "node:assert/strict";
import { test } from "node:test";
import { convert, detectScript, SCRIPTS } from "./engine.ts";

const SANTALI_OL = "ᱥᱟᱱᱛᱟᱲᱤ";

test("Ol Chiki → Roman", () => {
  assert.equal(convert(SANTALI_OL, "olck", "latn"), "santaṛi");
});

test("Roman → Ol Chiki (diacritics and ASCII shortcuts)", () => {
  assert.equal(convert("santaṛi", "latn", "olck"), SANTALI_OL);
  assert.equal(convert("santaRi", "latn", "olck"), SANTALI_OL);
});

test("Ol Chiki → Indic scripts", () => {
  assert.equal(convert(SANTALI_OL, "olck", "beng"), "সান্তাড়ি");
  assert.equal(convert(SANTALI_OL, "olck", "deva"), "सान्ताड़ि");
  assert.equal(convert(SANTALI_OL, "olck", "orya"), "ସାନ୍ତାଡ଼ି");
});

test("Indic → Ol Chiki round trip", () => {
  for (const s of ["beng", "deva", "orya"] as const) {
    const there = convert(SANTALI_OL, "olck", s);
    assert.equal(convert(there, s, "olck"), SANTALI_OL, s);
  }
});

test("inherent vowel and aspiration", () => {
  assert.equal(convert("ᱠᱚᱞ", "olck", "beng"), "কল"); // ᱚ is the inherent vowel
  assert.equal(convert("কল", "beng", "olck"), "ᱠᱚᱞ");
  assert.equal(convert("ᱠᱷᱟ", "olck", "deva"), "खा");
  assert.equal(convert("kha", "latn", "olck"), "ᱠᱷᱟ");
});

test("digits and punctuation", () => {
  assert.equal(convert("᱑᱒᱓᱾", "olck", "latn"), "123.");
  assert.equal(convert("᱑᱒᱓᱾", "olck", "beng"), "১২৩।");
  assert.equal(convert("১২৩।", "beng", "olck"), "᱑᱒᱓᱾");
});

test("every pair converts without throwing", () => {
  for (const from of SCRIPTS) for (const to of SCRIPTS) convert(convert(SANTALI_OL, "olck", from), from, to);
});

test("script detection", () => {
  assert.equal(detectScript(SANTALI_OL), "olck");
  assert.equal(detectScript("সান্তাড়ি"), "beng");
  assert.equal(detectScript("सान्ताड़ि"), "deva");
  assert.equal(detectScript("ସାନ୍ତାଡ଼ି"), "orya");
  assert.equal(detectScript("santali"), "latn");
});
