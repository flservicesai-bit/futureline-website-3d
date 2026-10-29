/**
 * DecodeText — resolves scrambled glyphs into the real string on mount.
 *
 * The final text is the initial render output, not the scramble. That matters
 * for three reasons: it's what the server sends (so crawlers and no-JS
 * visitors read real words), it's what a screen reader announces, and it means
 * reduced motion needs no special case — the effect simply never starts.
 *
 * Separators are held in place while letters resolve, so the shape of the line
 * stays stable instead of jittering.
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ<>[]{}/\\=+*#'
const HOLD = new Set([' ', '·', '.', '-', '—'])

interface Props {
  text: string
  className?: string
  /** Total frames to resolve; ~34ms each. */
  frames?: number
  delayMs?: number
}

export function DecodeText({ text, className, frames = 36, delayMs = 600 }: Props) {
  const [display, setDisplay] = useState(text)
  const reduced = usePrefersReducedMotion()
  const raf = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (reduced) {
      setDisplay(text)
      return
    }

    let frame = 0
    let timer: ReturnType<typeof setInterval> | undefined

    const start = window.setTimeout(() => {
      timer = setInterval(() => {
        frame += 1
        const progress = frame / frames
        const locked = Math.floor(progress * text.length)
        let out = ''
        for (let i = 0; i < text.length; i++) {
          const ch = text[i]
          out += i < locked || HOLD.has(ch) ? ch : POOL[Math.floor(Math.random() * POOL.length)]
        }
        setDisplay(out)
        if (frame >= frames) {
          clearInterval(timer)
          setDisplay(text)
        }
      }, 34)
    }, delayMs)

    return () => {
      window.clearTimeout(start)
      if (timer) clearInterval(timer)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [text, frames, delayMs, reduced])

  // Screen readers get the real text from a visually hidden copy, so the
  // scramble is never read out mid-resolve. (aria-label on a <span> is
  // ignored, which left nothing to read.)
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{display}</span>
    </span>
  )
}
