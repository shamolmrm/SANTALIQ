# Module: Script Converter

**Status:** Beta — live at `/tools/script-converter`. Rules are a **draft awaiting native-speaker review**.
**Code:** `frontend/src/lib/script/engine.ts` · tests `engine.test.ts` (`pnpm test`)

## Scope
Converts Santali text between the five scripts it is written in — **script only, not translation**:

| Code | Script | Notes |
| --- | --- | --- |
| `olck` | Ol Chiki | Pivot script — every conversion goes through Ol Chiki |
| `latn` | Roman | Diacritics ṭ ḍ ṇ ṛ ñ ŋ ō, plus ASCII shortcuts |
| `beng` | Bengali | |
| `orya` | Odia | |
| `deva` | Devanagari | |

Runs in the browser (no server round-trip) to satisfy the low-internet principle.

## Current rules (draft)

### Ol Chiki ↔ Roman
| Ol Chiki | Roman | | Ol Chiki | Roman |
| --- | --- | --- | --- | --- |
| ᱚ | o | | ᱟ | a |
| ᱤ | i | | ᱩ | u |
| ᱮ | e | | ᱳ | ō (shortcut `O`) |
| ᱠ | k | | ᱜ | g |
| ᱝ | ŋ (input `ng`) | | ᱪ | c |
| ᱡ | j | | ᱧ | ñ (input `ny`) |
| ᱴ | ṭ (`T`) | | ᱰ | ḍ (`D`) |
| ᱬ | ṇ (`N`) | | ᱛ | t |
| ᱫ | d | | ᱱ | n |
| ᱯ | p | | ᱵ | b |
| ᱢ | m | | ᱭ | y |
| ᱨ | r | | ᱲ | ṛ (`R`) |
| ᱞ | l | | ᱣ | w |
| ᱶ | v | | ᱥ | s |
| ᱦ | h | | ᱷ | h after k g c j t d ṭ ḍ p b ṛ |
| ᱸ | combining tilde (vowel + `~`) | | ᱹ | combining dot below (ạ) |
| ᱾ | . | | ᱐–᱙ | 0–9 |

### Ol Chiki ↔ Bengali / Odia / Devanagari
- One shared offset table (the three blocks share the ISCII layout).
- ᱚ is treated as the **inherent vowel**: consonant + ᱚ → bare consonant.
- Consonant + consonant → consonant + virama (conjunct).
- Word-final bare consonant ↔ no vowel (schwa deletion).
- Aspirated: ᱠᱷ → খ/ଖ/ख etc.; consonants without an aspirated letter → consonant + virama + HA.
- ᱭ → য় (Bengali) · ୟ (Odia) · य (Devanagari). ᱣ → ৱ · ୱ · व. ᱲ → ড় · ଡ଼ · ड़.
- ᱸ / ᱺ → chandrabindu. ᱹ ᱻ ᱼ ᱽ have no Indic equivalent yet and are dropped.
- Indic → Ol Chiki: plain য / ଯ → ᱡ (pronounced /j/); Devanagari य → ᱭ. Anusvara → ᱝ. শ ষ → ᱥ.

## Open questions for reviewers
1. **ᱚ vs ᱳ in Roman** — is `o` / `ō` acceptable, or is another convention (e.g. `ɔ` / `o`) preferred?
2. **Glottal (checked) consonants** — ᱜ ᱡ ᱫ ᱵ at word end (k' c' t' p'): how should they be written in Roman and in each Indic script?
3. **Word-final ᱚ** — e.g. a word ending in consonant + ᱚ currently loses the ᱚ in Indic scripts. Should it be written with an explicit mark?
4. **ᱹ (gaahlaa ttuddaag) and ᱻ (relaa)** — preferred representation in Bengali, Odia, Devanagari.
5. **ᱣ in Bengali** — ৱ, or ওয় / ব?
6. **ᱭ in Bengali** — য় correct everywhere?
7. **Conjuncts** — are visible conjuncts acceptable, or should clusters be written with explicit hasanta/virama?
8. **Regional spellings** — do Bengali-, Odia- and Devanagari-script Santali communities differ in conventions we should support as options?

Reviewer feedback goes in `docs/decisions/` as an ADR, then into the tables and tests.
