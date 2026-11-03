# Design System

Source of truth: `frontend/src/app/globals.css` (tokens) and `frontend/src/components/` (components).

## Brand
| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | `#F7F9FC` soft white | `#071B2B` deep navy | page background |
| `bg-elevated` | `#FFFFFF` | `#0C2538` | cards, inputs |
| `bg-sunken` | `#EEF2F7` | `#05141F` | alternating sections, footer |
| `fg` | `#071B2B` | `#F7F9FC` | text, primary buttons |
| `muted` | `#5A6B7C` | `#93A6B8` | secondary text |
| `accent` | `#13865B` emerald | `#2BB37E` | links, eyebrows, live status |
| `accent-2` | `#C9971C` gold (contrast-adjusted) | `#E9B83E` gold | highlights, numbering |
| `navy` | `#071B2B` | `#071B2B` | brand panels |

Tailwind utilities map 1:1: `bg-bg`, `text-muted`, `border-line`, `text-accent`, `bg-gold-soft`, `shadow-card`, `rounded-[var(--radius-card)]`.

## Typography
- **Inter** for UI and display (`font-sans`, `font-display`), with Noto Sans **Ol Chiki, Bengali, Devanagari, Oriya** in the fallback chain so every Santali script renders correctly.
- Display headings: `font-display font-bold|extrabold tracking-tight`, 4xl → 7xl.

## Theme
- Light by default; follows OS dark mode; user override via the header toggle (system → light → dark), stored in `localStorage.theme` and applied before paint (`themeInitScript`).

## Components
| Component | File |
| --- | --- |
| Header (desktop nav, theme toggle, mobile menu) | `site-header.tsx`, `mobile-nav.tsx`, `theme-toggle.tsx` |
| Footer | `site-footer.tsx` |
| Section heading (eyebrow / title / lead) | `section-heading.tsx` |
| Status badge (Live / Building / Planned) | `status-badge.tsx` |
| Script showcase | `script-showcase.tsx` |
| Script converter, Translator | `script-converter.tsx`, `translator.tsx` |

## Rules
- No fake statistics, testimonials, users or activity. Status badges reflect reality (`lib/ecosystem.ts`).
- No non-functional buttons: planned features are shown as non-clickable cards.
- Accessible: semantic landmarks, skip link, visible focus ring, `aria-live` for results, reduced-motion respected.
- Cultural motif: `.pattern-lattice` — a subtle geometric lattice, decorative only and masked to low opacity.
