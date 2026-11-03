# Community modules: Connect, Social, News, Career, Developer, PWA

## Connect: notifications (`/notifications`, bell in the header)
- Table `notifications` (migration 0012). Each row stores `kind` and `data`; the frontend writes and translates the text (`lib/notifications.ts`).
- Events:
  - someone follows you;
  - someone comments on your writing;
  - a reviewer decides on your dictionary word, heritage item, voice recording or career listing;
  - a moderator removes your writing.
- Nobody is notified about their own action. The bell checks for new notifications once a minute while the tab is visible. Opening the page marks everything as read.
- Next: email digests, private messages, discussions.

## Social: follow, comments, feed
- `follows` (you cannot follow yourself) and `comments` (removal is soft, so the record stays). The follow button and counts are on `/people/{id}`; comments appear under published writing; `/feed` shows new writing from people you follow.
- A comment can be removed by the commenter, by the author of the piece, or by a reviewer or admin. Comments are limited to 30 per hour.
- Next: groups, polls.

## News (`/news`)
- News is written in SANTALIQ Write with the new kind `news`. **Only reviewers and admins** can publish it, to keep false news out. It works in all five scripts like any other writing.

## Career (`/careers`, `/careers/new`, admin Review → Careers)
- `job_posts` holds jobs, internships, scholarships and training. Every listing needs an https link or an email for applying.
- A deadline that has already passed is rejected; expired listings are hidden automatically.
- Listings go through review: they start pending, a different reviewer decides, and the poster is notified.
- Every listing shows a warning never to pay money to apply.

## Developer (`/developers`)
- A public guide to the read endpoints, with examples, fair-use limits and licences (NLLB is non-commercial; the lexicon is CC BY 4.0).
- The full reference is served at `/api/v1/docs` (Swagger) and `/api/v1/openapi.json`.

## PWA
- `app/manifest.ts` and icons (`public/icon-*.png`, generated from the Ol Chiki ᱥ mark), so the site can be installed on a phone.
- `public/sw.js`:
  - hashed static files are served from the cache first;
  - public pages are fetched from the network first, with the cached copy used offline;
  - `/api` is never cached;
  - account, admin, notifications and feed pages are never cached;
  - when there is no connection, the fallback is `/offline`.
- The converter, keyboard and Learn work offline once they have been opened.

## Not built, and why
- **Media** needs paid storage and bandwidth for video.
- **Studio** needs a paid AI key and Santali TTS.
- **Market** needs payments, legal registration and tax handling.
