# Module: SANTALIQ Heritage

**Status:** v1 beta. **Pages:** `/heritage`, `/heritage/{slug}`, `/heritage/submit`, plus a review queue on `/admin`.
**Code:** `backend/app/modules/heritage/`, `frontend/src/app/heritage/`.

## Principles
- **Community-owned:** SANTALIQ never writes cultural content itself. The archive starts empty and holds only what members share.
- **Consent and source are required:** every item names its source (who told it, where it was recorded, or which book it comes from). The submitter must confirm three things:
  - they have permission to share it publicly;
  - it is not sacred or private knowledge;
  - SANTALIQ may publish it with credit.
- **Review before public:** items start `pending`. A reviewer other than the submitter verifies or rejects them, with a note. Only `verified` items are listed, served, put in the sitemap, or shown to search engines.
- **Consent can be withdrawn:** a contributor can delete their item at any time, and the deletion is audited.
- **Not for AI training:** heritage items are not used as AI training data. Any future use needs a separate, explicit decision.

## Kinds
Folk stories, songs, festivals, history, crafts & knowledge, and other.

## API
| Method | Path | Who |
| --- | --- | --- |
| GET | `/api/v1/heritage/items?kind=&q=` | public (verified only; `q` matches title or region) |
| GET | `/api/v1/heritage/items/{slug}` | public if verified; contributor and reviewers otherwise |
| GET | `/api/v1/heritage/me/items` | contributor (with review notes) |
| POST | `/api/v1/heritage/items` | signed in; `consent: true` and `source` required; 10 per hour |
| DELETE | `/api/v1/heritage/items/{id}` | contributor (withdraw) or admin |
| GET | `/api/v1/heritage/sitemap` | verified slugs |
| GET | `/api/v1/admin/heritage?status=` | reviewer+ |
| POST | `/api/v1/admin/heritage/{id}` `{decision, note}` | reviewer+; not own (unless admin) |

## Reading
- Verified items are rendered on the server, with metadata and schema.org `CreativeWork` JSON-LD.
- The page has a five-script reader switch; conversion uses the draft rules.
- Each item shows its source and contributor credit.

## Next
- Audio and photos for songs and stories. This needs object storage and a consent form per recording.
- Collections (for example, one festival across several regions), and a community-level permission flag decided with advisors.
