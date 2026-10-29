# Handoff — `feat/light-redesign`

> **Historical document.** It records the state when the light redesign was handed
> over and is kept for its design notes. Several facts below are out of date:
>
> - `npx tsc --noEmit` reports **0** errors, builds now fail on type errors
>   (`ignoreBuildErrors` is gone), and CI (`.github/workflows/ci.yml`) type-checks
>   and builds every pull request.
> - `NeuralPathway`, `DualWalkway` and the other unused sections were deleted;
>   `HeroRibbon3D` now composites for the light pages and pauses off-screen.
> - URLs are always locale-prefixed (`/en/...`, `/ar/...`); see `src/i18n/routing.ts`.
>
> For running and deploying the site today, use `docs/DEPLOYMENT.md`.

**Tag:** `v2.0.0-light-redesign` · **Head:** `b023fd0` · **Base:** `main` (`f6a558b`, no drift as of this writing)

This branch replaces the public face of futureline.ai with a light 3D design and adds
bilingual EN/AR support across the app. Auth, Stripe, Prisma, courses and the admin
portal are untouched in behaviour.

Everything below is **verified against the code**, not from memory. File paths are real.

---

## State at handoff

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 3 errors — all pre-existing, see [Baseline](#baseline-not-caused-by-this-branch) |
| `npx next build` | Green |
| Route smoke test | `/`, `/ar`, `/services`, `/courses`, `/audit`, `/ai`, `/login`, `/register`, `/dashboard`, `/admin` → all `200` |
| SSR/SEO | Copy present in server HTML; **0** `<canvas>` in it |
| RTL | `/` → `lang="en" dir="ltr"` · `/ar` → `lang="ar" dir="rtl"` |
| `messages/ar.json` | 85/85 keys, full parity with `en.json` |
| Merged to `main` | **No** — still open |

### Getting started

```bash
npm install            # .npmrc pins legacy-peer-deps=true — see "Dependency conflict" below
npm run dev            # defaults to port 5000
```

> On macOS, port 5000 is taken by AirPlay Receiver and returns `403` on every route.
> That is not the app. Use `npx next dev -p 5123` or disable the receiver in
> System Settings → General → AirDrop & Handoff.

---

## What is left to do

Ordered by what will bite you soonest.

### 1. Verify the scroll-scrubbed sections by hand — **not yet done**

Three sections pin and scrub with GSAP ScrollTrigger:

- `src/components/sections/ThreeActStory.tsx` (+ `…Scene`, `…Canvas`, `…CanvasLazy`)
- `src/components/sections/VisionMission.tsx`
- `src/components/sections/NeuralPathway.tsx` (pre-existing)

These were **never verified visually**. Lenis only advances on trusted user input, so
programmatic scrolling in an automated browser does not drive them — a control experiment
confirmed the *pre-existing* shipped sections behave the same way, so this is a testing
limitation, not evidence of a bug. Still: scroll the home page by hand, up and down,
several times, and watch for pin-spacer jumps at the boundaries between the three pinned
sections. Then resize the window mid-page and check nothing lands off-position.

Known landmines already mitigated, worth re-checking if you see drift:

- `SplashIntro` sets `body.overflow: hidden`; a pin initialising during the intro measures
  against a locked body. `ScrollTrigger.refresh()` was added to its `finish()`
  (`src/components/ui/SplashIntro.tsx`).
- Pinned sections use `h-screen` (100vh), deliberately **not** `100dvh` — mobile URL-bar
  collapse would resize mid-scroll and jump the pin.

### 2. `NeuralPathway` is still dark on a light page — **design decision needed**

`src/components/sections/NeuralPathway.tsx` renders `bg-black` with `text-white` cards
(lines ~485, 519, 754) and sits between `WhoWeServe` and `ReadinessCTA` on the light home
page. It was intentionally left alone to keep the admin "featured course" control working
and to limit blast radius, but visually it is a hard black slab in the middle of a light
page.

Pick one:

- **Restyle it light** to match the rest of the page — largest effort, best result.
- **Keep it dark as a deliberate "theatre" break** — then commit to it: add generous
  top/bottom transitions so it reads as intentional, not unconverted.
- **Move it to `/courses`** and drop it from home entirely.

Whatever you choose, the admin featuring flow must keep working — it is referenced by
`admin/courses/[id]/edit` and `admin/courses/new` via `featuredSlot`.

### 3. Two canvases render at 60fps while off-screen — **battery/perf, ~4 lines each**

`src/hooks/useInViewFrameloop.ts` exists and returns `'always' | 'demand'`. It is wired
into the new scenes (`GlobeHeroScene.tsx`, `ThreeActStoryScene.tsx`, `three/SceneCanvas.tsx`)
but **not** into the two pre-existing ones, which are still hardcoded:

- `src/components/sections/NeuralPathway.tsx:760` → `frameloop="always"`
- `src/components/sections/DualWalkway.tsx:447` → `frameloop="always"`

Retrofit both. Use `'demand'`, never `'never'` — `"never"` renders zero frames and gives a
blank canvas (this cost us an afternoon).

`DualWalkway` is no longer on the home page, so it only matters if you re-introduce it —
see [Dead code](#7-dead-code-left-in-place-deliberately).

### 4. `HeroRibbon3D` has no light-appropriate treatment

`src/components/sections/HeroRibbon3D.tsx` composites `Bloom` + `Vignette`, which renders
an **opaque dark frame** — fine on a dark hero, wrong on a light one.

- Still used on `/ai` (`ai/page.tsx:70`) and `/services` (`services/page.tsx:35`), where the
  surrounding hero is dark enough to carry it.
- **Removed** from the service detail hero — see the comment at
  `src/components/sections/ServiceDetailLayout.tsx:218`.

To bring it back on light backgrounds it needs either a different postprocessing chain
(drop `Vignette`, tone the `Bloom` down hard) or a different visual altogether. Right now
the service detail heroes have no 3D moment at all, which is a visible inconsistency
against `/ai` and `/services`.

### 5. Database content is English-only — **needs a schema decision**

Static UI copy is fully bilingual (`messages/en.json` / `messages/ar.json`, 85/85 keys).
Anything from Postgres is not. `prisma/schema.prisma` has **no** translation columns:

| Model | Line | Translatable fields |
|---|---|---|
| `Course` | 35 | title, description, … |
| `Lesson` | 94 | title, content |
| `Service` | 110 | title, description |
| `Testimonial` | 168 | body, role |

Two options, both a migration against production data — **back up first**:

- **`*_ar` columns** — simple, fast to query, gets ugly beyond two locales.
- **A `Translation` table** keyed by `(model, recordId, field, locale)` — scales, more joins,
  more application code.

Until this lands, `/ar` shows translated chrome around English course and service content.
That is the single most visible gap in the Arabic experience.

### 6. Inner pages are not translated

Stage 11 covered the home page. The dashboard, admin, instructor and auth pages still have
hardcoded English strings. They render correctly under `/ar` (layout, direction, fonts) but
the copy is English. Mechanical work: lift strings into `messages/*.json` and swap in
`getTranslations`.

### 7. Dead code left in place, deliberately

These are referenced by nothing but themselves. They were left untouched to keep the diff
reviewable — delete them in a separate cleanup commit:

| File | Note |
|---|---|
| `src/components/sections/ParticleHero.tsx` | Replaced by `GlobeHero` |
| `src/components/sections/DualWalkway.tsx` (+`Lazy`) | Replaced by `ThreeActStory` |
| `src/components/sections/FeaturesGrid.tsx` | Already dead before this branch |
| `src/components/sections/Records.tsx` | Already dead before this branch |
| `src/components/sections/ServiceCards.tsx` | Already dead before this branch |

### 8. Home page is `force-dynamic`

`src/app/[locale]/(public)/page.tsx:16` sets `export const dynamic = 'force-dynamic'` because
`NeuralPathway` does a Prisma read for featured courses. Switching to `revalidate` plus
`revalidatePath('/')` from the admin mutation is a real win and was deliberately kept **out
of scope** so the cutover stayed small. Good first follow-up.

---

## Constraints you must not break

These are not preferences — violating them breaks the build or the page.

1. **CSP blocks all CDNs.** `src/middleware.ts` sets `script-src 'self'` and
   `font-src 'self' data:`. No CDN `<script>`, no Google Fonts `<link>`. Fonts come from
   `next/font/google` (self-hosted at build); libraries come from npm.
2. **Do not add `@react-three/drei`.** It is installed but imported nowhere — drei 10
   peer-requires React 19 and this app is on React 18.3.1. R3F 9 is proven here; drei is not.
   The 3D→2D label projection uses manual `vec.project(camera)` for exactly this reason.
3. **Pass `flat` to every new `<Canvas>`.** R3F defaults to `ACESFilmicToneMapping`, which
   visibly desaturates the teal/mint palette. `three/SceneCanvas.tsx` defaults it to true.
   Exception: `NeuralPathway` must keep tone mapping — it uses `<Bloom>`.
4. **Three files per scene**, so copy is server-rendered:
   `X.tsx` (SSR section, headings, captions) → `XCanvas.tsx` (R3F tree only) →
   `XCanvasLazy.tsx` (`dynamic(ssr:false)`). Never wrap a whole section in `ssr:false` —
   `NeuralPathwayLazy` does, and its headings are invisible to crawlers. Don't repeat it.
5. **Scroll progress travels by ref, never state.** `useSectionProgress` returns a ref and
   exposes `onProgress`. Only coarse discrete changes (active caption index) touch `setState`.
   Paint DOM from ScrollTrigger's `onProgress`, **not** from the R3F frame loop — otherwise
   copy depends on WebGL rendering and vanishes when the canvas fails.
6. **Nothing is hidden by default.** There is no `[data-reveal]{opacity:0}` + safety-timer
   pattern. GSAP `fromTo` sets its own from-state; reduced motion simply never creates the
   tween. There is no code path where content stays invisible.
7. **Three live WebGL contexts on the home page** (`GlobeHero`, `ThreeActStory`,
   `NeuralPathway`). Browsers evict past ~8–16, which shows up as a randomly blank canvas.
   Treat 3 as the ceiling. Compare `next build` route output before/after adding any 3D work,
   and watch that `@splinetool/runtime`, `@react-three/rapier`, `camera-controls` or
   `three-mesh-bvh` don't get pulled into a lazy chunk by an incidental import.
8. **Points geometry needs `geometry.deleteAttribute('uv')`.** With UVs present, Three
   samples the glow sprite per-vertex and the points render as hard squares.

---

## Baseline, not caused by this branch

`npx tsc --noEmit` reports exactly **3** errors, all pre-existing:

```
src/app/[locale]/(protected)/admin/courses/new/page.tsx(39,13): error TS7006: Parameter 'prev' implicitly has an 'any' type.
src/app/[locale]/(protected)/admin/courses/new/page.tsx(48,23): error TS7006: Parameter 'prev' implicitly has an 'any' type.
src/app/[locale]/(protected)/admin/courses/new/page.tsx(49,18): error TS7006: Parameter 'prev' implicitly has an 'any' type.
```

**Treat 3 as the pass mark.** Anything above it is a regression you introduced.

### No safety net — run `tsc` by hand

`next.config.js:15-16` sets `typescript.ignoreBuildErrors: true` and
`eslint.ignoreDuringBuilds: true`, and there is **no CI**. A green `next build` proves
nothing about types. Run `npx tsc --noEmit` every change, or type errors ship silently.
Wiring up CI would be a genuinely valuable contribution.

### Dependency conflict

`.npmrc` sets `legacy-peer-deps=true`. This is deliberate: `@react-three/drei@10` (installed,
unused) peer-requires React 19 while the app is on React 18.3.1, so a plain `npm install`
fails with `ERESOLVE`. Removing drei from `package.json` would let you drop the flag — but
that is someone else's dependency, so it was left alone.

### A build trap that cost real time

Do **not** run `next build` while `next dev` is running. They share `.next` and the build
clobbers the dev server's output, after which every route 500s. Stop the dev server first.
This bit us three separate times before the cause was clear.

---

## Suggested order of work

1. Hand-verify the scroll sections (#1) — cheapest, and tells you whether anything is broken.
2. Decide `NeuralPathway`'s treatment (#2) — the most visible unfinished thing.
3. Frameloop retrofit (#3) — ~10 minutes, real battery win.
4. `HeroRibbon3D` on light backgrounds (#4).
5. DB translation schema (#5) — the big one; agree the approach before writing the migration.
6. Inner-page translation (#6) and dead-code cleanup (#7) — mechanical, parallelisable.

Merge to `main` only after #1 and #2. Deploy on its own, with a revert commit ready.
