# Module: SANTALIQ Learn

**Status:** v1 beta — `/learn` · **Code:** `frontend/src/lib/learn/olchiki.ts`, `frontend/src/app/learn/`

## v1 (no server, works offline)
- **Alphabet explorer**: all 30 Ol Chiki letters in Unicode order (6 rows × 5, each row starting with a vowel),
  Unicode names, code points, draft Roman sound, and the letter (consonants with ᱟ) in Roman/Bengali/Odia/Devanagari.
- **Digits** ᱐–᱙ and **marks** (ᱸ ᱹ ᱺ ᱻ ᱼ ᱽ ᱾ ᱿) with Unicode names.
- **Quizzes** (10 questions): letter → sound, sound → letter, digits. Best scores in `localStorage`.
- Content sources: the Unicode Standard (letters, order, names) and SANTALIQ's draft romanization —
  a unit test keeps the Learn sound column identical to the script converter. No Santali words or
  cultural facts are invented.

## Next
- Lessons with real vocabulary once the dictionary has verified entries (words, pronunciation audio).
- Signed-in progress tracking, kids' section, teacher view.
