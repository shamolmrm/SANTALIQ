# Module: SANTALIQ Write

**Status:** v1 live — `/write`
**Code:** `backend/app/modules/write/` · `frontend/src/app/write/`, `components/post-editor.tsx`, `lib/markdown.tsx`

## What it does
- Signed-in members write **articles, poetry, stories, essays, journals**; save drafts; publish/unpublish; delete.
- **Universal Script Switch for readers**: every piece can be read in Ol Chiki, Roman, Bengali, Odia or Devanagari.
  The author's original script is stored (`posts.script`) and marked ●; other scripts are converted in the browser
  with the draft conversion rules (labelled as such).
- Editor: title, kind, body with Write/Preview tabs, formatting toolbar, Roman phonetic typing into the body's script.
- Formatting: safe Markdown subset (`# `, `## `, `> `, `- `, `**bold**`, `*italic*`), rendered to React elements —
  no HTML is ever injected. Single line breaks are preserved (poetry).

## Safety
- Rate limit: 20 new pieces per user per hour.
- Readers can **report** a published piece (one report per user per piece).
- Reviewers/admins see reported pieces at `/admin`, and can **remove** (with a note shown to the author),
  **restore**, or **dismiss** reports. Removed pieces are hidden from the public and cannot be edited.
- Admins can delete any piece. All actions are audited.

## API
| Method | Path | Who |
| --- | --- | --- |
| GET | `/api/v1/write/posts?kind=&author=` | public (published only) |
| GET | `/api/v1/write/posts/{slug}` | public if published; author/moderators otherwise |
| GET | `/api/v1/write/me/posts` | author |
| POST | `/api/v1/write/posts` | signed in |
| PATCH / DELETE | `/api/v1/write/posts/{id}` | author (delete: also admin) |
| POST | `/api/v1/write/posts/{id}/report` | signed in |
| GET | `/api/v1/admin/reports` | reviewer+ |
| POST | `/api/v1/admin/posts/{id}/moderate` `{action: remove|restore|dismiss}` | reviewer+ |

## Next
- Server-side rendering of published pieces for search engines and link previews.
- Author profile pages, follow, comments (Phase 6 social).
- Cover images (needs object storage).
