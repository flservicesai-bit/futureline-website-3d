/**
 * usePrefersReducedMotion — listens to the OS-level setting in real time.
 * WCAG 2.3.3 + vestibular safety. Required for every animated section.
 */
'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

export function usePrefersReducedMotion(): boolean {
  // useSyncExternalStore renders the server value (false) while hydrating and
  // switches to the real one straight after, so server and client markup
  // match. Reading matchMedia in a useState initialiser instead made the
  // first client render differ from the server's under reduced motion, which
  // React reports as a hydration error (#418) and re-renders the page for.
  // Components mounted later (client navigation) get the real value at once.
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
