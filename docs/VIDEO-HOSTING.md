# Course videos

Paid lessons are hosted on **Bunny Stream** (bunny.net). The videos stream from
Bunny's CDN, never through this server, and a learner can only play them on
futureline.ai through a link the server signed for them moments ago.

YouTube and Vimeo links still work, for free or public lessons. Anyone who gets
hold of those links can watch them anywhere, so don't use them for paid content.
The lesson form says which kind of link was pasted.

## How it works

1. A lesson stores its embed link, e.g.
   `https://iframe.mediadelivery.net/embed/<library id>/<video id>`
   (`Lesson.videoUrl`). A pasted embed code is reduced to that link and any
   `token`/`expires` in it is dropped (`src/lib/video-source.ts`).
2. The learner's course page (`/dashboard/course/<slug>`) never sends video links
   to the browser, only whether each lesson has one.
3. When a lesson is opened, the lesson viewer asks
   `GET /api/lessons/<id>/player`. It answers only a signed-in learner enrolled
   in that course (or an admin, or the instructor who owns it). It is
   rate-limited and never cached.
4. For Bunny it returns the embed link signed with the library's token
   authentication key: `?token=<sha256 hex of key + video id + expires>&expires=<unix time>`,
   valid for 2 hours (`src/lib/video-player.ts`). The link is only checked when
   the player loads, so a lesson in progress keeps playing past that.
5. The learner's email drifts over the video as a faint watermark, so a screen
   recording that leaks shows whose account it came from.

## Setting up Bunny (once)

1. Create a bunny.net account and, under **Stream**, a video library
   (e.g. "FutureLine Academy"). Pick the regions closest to your learners.
2. Library **Security** settings:
   - **Allowed domains** (referrer protection): `futureline.ai` and `www.futureline.ai`.
   - **Embed view token authentication**: on. Copy the **token authentication key**.
   - **Block direct URL file access**: on.
3. Library **Encoding**: turn off MP4 fallback, so only the streaming
   renditions exist and there is no single file to download.
4. On the server, add the key to `/opt/futureline/.env`, then reload the app:

   ```bash
   BUNNY_STREAM_TOKEN_KEY="<token-authentication-key>"
   ```

   ```bash
   pm2 reload futureline-web --update-env
   ```

   Until the key is set, Bunny links go out unsigned. They then only play while
   token authentication is off in the library, so set the key before turning it on.

## Adding a course's videos

1. Upload the videos in the Bunny dashboard (drag and drop; Bunny encodes them
   for adaptive streaming).
2. For each video, copy its embed code (or the embed link).
3. Admin > Course Builder: pick the course, add a lesson per video and paste the
   embed code into the video field. The note under the field should read
   "Bunny Stream: protected".

## Checking it

- Open a lesson as an enrolled learner: the video plays.
- Copy the iframe `src` from the browser's developer tools and open it in a new
  tab: Bunny refuses it (the referrer isn't futureline.ai). After 2 hours the
  same link stops working anywhere.
- `GET /api/lessons/<id>/player` as a learner who isn't enrolled: `403`.

Course documents (PDFs, prompt files) work the same way, uploaded in the Course
Builder and stamped with each learner's name: see `docs/LESSON-FILES.md`.

## Limits

Nothing on the web stops someone filming their screen; the watermark makes such
a copy traceable. The watermark isn't drawn in the player's own full-screen mode,
which shows only the player. Full DRM (Bunny MediaCage Enterprise) would block
most screen recorders but costs a monthly fee.
