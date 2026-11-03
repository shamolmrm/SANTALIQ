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

## Groups (`/groups`)
- Public groups. Anyone signed in can create one (3 per day). Members post (30 per hour).
- The group owner, a reviewer or an admin can remove posts. The owner or an admin can delete the group.

## Messages (`/messages`, envelope icon in the header)
- One-to-one private messages: 60 per hour, no messages to yourself.
- Either side can block the other, and a block stops messages in both directions. Opening a conversation marks it as read.
- Deleting an account deletes all of its messages and blocks.

## Market, Media, Digital library (`/market`, `/media`, `/library`, `/listings/{id}`, `/listings/new`)
- These share the `listings` table (migration 0013), with `section` set to market, media or library. Every listing is reviewed first (admin Review → "Market · Media · Library") and its poster is notified of the decision.
- **Market:** no payments on SANTALIQ. Every product has its own page, `/market/{id}`:
  - **Rendering:** the page is rendered on the server, with Open Graph tags and schema.org `Product`/`Offer` JSON-LD.
  - **Photos:** up to 4, shown as a gallery with thumbnails.
  - **Price:** a numeric price in INR, BDT, NPR or USD, formatted like ₹1,250. The market list can be sorted by newest or by price, low to high or high to low.
  - **Stock:** optional; when it reaches 0 the product shows "Out of stock".
  - **Buying:** a "Buy on WhatsApp" button that pre-fills a message, a "Message the seller" button, and a share button. A WhatsApp number or another contact is required.
  - **More from seller:** the page lists the seller's other products, and a safety notice is always shown.
  - Product pages are listed in the sitemap (migration 0014).
- **Media:** photos are uploaded here (JPEG, PNG or WebP, at most 3 MB, type checked from the file's magic bytes). Videos, podcasts and music are links; YouTube links become `youtube-nocookie` embeds.
- **Library:** a link or author/publisher is required. We link only to legal copies and never host copyrighted files.
- Images are stored in `data/media` (bind mount `/data/media`), mirrored by the nightly backup, and deleted together with the listing or the account.

## Still not built
- **Studio** (AI stories, scripts and voice-over) needs a paid AI key and Santali TTS. It will be built on the existing AI module once the key is set.
- **Android app in Play Store**: the PWA already installs on Android. A Play Store listing needs a USD 25 developer account (Trusted Web Activity).
- **Santali TTS / ASR** need enough verified voice recordings first.
