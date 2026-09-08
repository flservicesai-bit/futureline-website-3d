/**
 * Scroll helpers for same-page anchors.
 *
 * Native anchor jumps are unreliable here for three reasons: Lenis owns the
 * scroll position, globals.css sets `scroll-behavior: auto !important` while
 * Lenis is active, and ScrollTrigger pins shift document offsets so an anchor
 * resolved before a refresh lands in the wrong place.
 *
 * The Lenis instance is published by SmoothScrollProvider so callers can drive
 * it directly instead of fighting it.
 */
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type LenisLike = {
  scrollTo: (target: string | number | HTMLElement, opts?: Record<string, unknown>) => void
  /** Pause/resume smooth scrolling — used to freeze the page behind the mobile menu. */
  stop?: () => void
  start?: () => void
}

declare global {
  interface Window {
    __flLenis?: LenisLike
  }
}

/** Height of the sticky header — anchors must clear it. */
export const HEADER_OFFSET = -64

type LenisFull = LenisLike & {
  resize?: () => void
}

/**
 * @param smooth Animate via Lenis (same-page anchor clicks) or jump natively.
 *   Landing on a section after a route change must use the native path: Lenis
 *   goes inert across a client-side navigation — its cached dimensions and
 *   scroll position both go stale, and `scrollTo` becomes a no-op even after
 *   `resize()`. Measured on /ar/courses → "/ar#who-we-serve": Lenis reported
 *   scroll 0 while the document was at 2002, and neither an element nor a
 *   numeric target moved the page. `window.scrollTo` lands it exactly.
 */
export function scrollToHash(
  hash: string,
  { offset = HEADER_OFFSET, smooth = true, refresh = true } = {},
) {
  if (typeof window === 'undefined') return
  const id = hash.startsWith('#') ? hash.slice(1) : hash
  const el = document.getElementById(id)
  if (!el) return

  // Pins change offsets; make sure measurements are current before jumping.
  // Skipped on the landing path: refresh() restores its own scroll position,
  // which was silently undoing the jump on every tick of the settle loop.
  if (refresh) ScrollTrigger.refresh()

  const lenis = window.__flLenis as LenisFull | undefined
  const targetY = Math.round(el.getBoundingClientRect().top + window.scrollY) + offset

  if (smooth && lenis) {
    lenis.resize?.()
    lenis.scrollTo(targetY, { duration: 1.1, force: true })
    // Even on the same page Lenis can be mid-teardown; verify and fall back
    // rather than silently leaving the visitor where they were.
    window.setTimeout(() => {
      if (Math.abs(window.scrollY - targetY) > 8) {
        window.scrollTo({ top: targetY, behavior: 'auto' })
        lenis.resize?.()
      }
    }, 450)
    return
  }

  // Landing path. A native window.scrollTo is NOT enough while Lenis is
  // running: its RAF loop re-applies its own internal position every frame and
  // silently reverts the jump. Driving Lenis with `immediate` sets that
  // internal position directly, so there is nothing left to fight.
  if (lenis) {
    lenis.resize?.()
    lenis.scrollTo(targetY, { immediate: true, force: true })
    return
  }
  window.scrollTo({ top: targetY, behavior: 'auto' })
}

/**
 * Lands on `hash` and keeps it there while the page finishes settling.
 *
 * Two problems make a single jump unreliable when arriving from another page:
 *
 *  1. The target may not exist yet. The home page streams in, and its 3D hero
 *     and lazy scenes can take seconds to mount, so we wait for the element
 *     rather than assuming it's there.
 *  2. Once it exists, the position keeps moving as those scenes mount, and
 *     Next.js applies its own scroll restoration after the navigation — which
 *     was leaving visitors ~2400px short of the section.
 *
 * So: phase one waits for the element, phase two re-scrolls until the section
 * actually sits under the header. Aborts as soon as the visitor scrolls
 * themselves — yanking the page back under someone who has taken over is
 * worse than landing in the wrong place.
 */
export function scrollToHashWhenReady(
  hash: string,
  { waitMs = 12000, settleMs = 3000, interval = 150 } = {},
) {
  if (typeof window === 'undefined') return
  const id = hash.startsWith('#') ? hash.slice(1) : hash
  const waitUntil = Date.now() + waitMs

  let cancelled = false
  let timer: number | undefined
  let settleUntil = 0

  const events = ['wheel', 'touchstart', 'keydown'] as const
  const teardown = () => events.forEach((e) => window.removeEventListener(e, cancel))
  function cancel() {
    cancelled = true
    if (timer) window.clearTimeout(timer)
    teardown()
  }
  events.forEach((e) => window.addEventListener(e, cancel, { passive: true }))

  const tick = () => {
    if (cancelled) return
    const el = document.getElementById(id)

    if (!el) {
      // Phase one: still streaming in.
      if (Date.now() < waitUntil) timer = window.setTimeout(tick, interval)
      else teardown()
      return
    }

    // Phase two: element exists — give it a settle window from *now*, not from
    // navigation start, so a slow mount doesn't eat the whole budget.
    if (!settleUntil) settleUntil = Date.now() + settleMs

    if (Math.abs(el.getBoundingClientRect().top - -HEADER_OFFSET) <= 4) {
      teardown() // in place
      return
    }

    scrollToHash(hash, { smooth: false, refresh: false })

    if (Date.now() < settleUntil) timer = window.setTimeout(tick, interval)
    else teardown()
  }

  // Deliberately setTimeout, not requestAnimationFrame: rAF is suspended in a
  // hidden/background tab, so a link opened in one would never scroll at all.
  // The short delay still lets layout and ScrollTrigger's pin spacers settle.
  window.setTimeout(tick, 32)
}

/** Handles a cold load of /#section, once layout has settled. */
export function scrollToInitialHash() {
  if (typeof window === 'undefined' || !window.location.hash) return
  scrollToHashWhenReady(window.location.hash)
}
