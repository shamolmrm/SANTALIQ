# Module: SANTALIQ Voice

**Status:** consented voice-collection beta.
**Pages:** `/voice`, plus the "Voice review" queue on `/admin`.
**Code:** `backend/app/modules/voice/`, `frontend/src/app/voice/`, `frontend/src/components/voice-recorder.tsx`.

## Goal
Build a community-owned, consented, verified Santali speech collection, across many speakers, dialects and ages. Later it becomes the basis for Santali text-to-speech (TTS), speech recognition (ASR) and pronunciation tools (Phase 4).

## Consent (version `2026-11-v1`)
- No recording is possible before consent. The consent is stored with its version and time, and every change is audited.
- **Two separate choices**, each of which can be changed at any time:
  - **Public listening:** verified clips may be heard on SANTALIQ, shown with the speaker's display name and dialect. Turning this off hides the clips immediately.
  - **Research / speech technology:** verified clips may be used to research and train Santali speech models, and may be shared with researchers for that purpose.
- **Never used to clone or imitate an individual's voice.**
- The speaker confirms three things: they are the person speaking, they record voluntarily, and if they are under 18 a parent or guardian agrees too.
- Optional, self-described details: dialect, region, age range, gender.
- **Withdrawal:** a speaker can delete one clip, or all their voice data. Withdrawing everything deletes the files, the database rows and the consent record. Nightly backups mirror these deletions.
- If the consent text changes, bump `CONSENT_VERSION`. Speakers are then asked to consent again before they can record.

## What is recorded
- **Dictionary words:** random spellings from **verified** dictionary entries, in the chosen script. SANTALIQ never invents prompt sentences.
- **Own sentence:** the speaker types exactly what they will say. The reviewer checks that the audio matches the text.
- Recordings are made in the browser with MediaRecorder: Opus in WebM or Ogg, or MP4 on Safari. Each clip is at most 30 seconds and 2 MB.
- The server identifies the format from the file's magic bytes and never trusts the client's content type.

## Review
- Every clip is `pending` until a reviewer other than the speaker verifies or rejects it, optionally with a note.
- Audio access:
  - the speaker and reviewers can always listen;
  - everyone else can listen only to verified clips whose speaker chose public listening.

## Storage
- Files are stored on the VPS in `/home/ubuntu/docker/websites/santaliq/data/voice`, bind-mounted at `/data/voice` in `santaliq-api` and owned by uid 1001.
- The nightly backup mirrors them to `/home/ubuntu/backups/santaliq/voice`.
- There is no off-server voice copy yet. Encrypted off-server storage comes together with object storage.

## API
| Method | Path | Who |
| --- | --- | --- |
| GET | `/api/v1/voice/stats` | public |
| GET | `/api/v1/voice/clips` | public: verified clips with public-listening consent |
| GET | `/api/v1/voice/clips/{id}/audio` | per the access rules above |
| GET | `/api/v1/voice/prompts?script=` | public: verified dictionary spellings |
| GET / PUT | `/api/v1/voice/consent` | signed in |
| DELETE | `/api/v1/voice/me` | signed in: withdraw everything |
| GET | `/api/v1/voice/me/clips` | signed in |
| POST | `/api/v1/voice/clips` (multipart: `audio`, `text`, `script`, `lexeme_id?`, `duration_ms?`) | signed in, with consent; 60 per hour |
| DELETE | `/api/v1/voice/clips/{id}` | speaker or admin |
| GET | `/api/v1/admin/voice?status=` | reviewer+ |
| POST | `/api/v1/admin/voice/{id}` `{decision, note}` | reviewer+; not own (unless admin) |

## Next
- A research export containing only verified clips with research consent, with a manifest (text, script, dialect, duration) and a licence. The owner decides the licence.
- Prompt sets of verified sentences, once the dictionary has examples.
- TTS and ASR experiments once there are enough hours from enough speakers, evaluated by native speakers.
