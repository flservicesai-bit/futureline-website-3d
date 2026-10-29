'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/routing';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface ServiceStickyNavProps {
  title: string;
  ctaHref: string;
  ctaLabel: string;
  /** CSS gradient string, e.g. 'linear-gradient(to right, #2dd4bf, #3b82f6)' */
  gradient: string;
  /** Scroll depth (px) before nav slides in — defaults to 500 */
  triggerAt?: number;
}

export function ServiceStickyNav({
  title,
  ctaHref,
  ctaLabel,
  gradient,
  triggerAt = 500,
}: ServiceStickyNavProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > triggerAt);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [triggerAt]);

  return (
    /* Sits at top-16 to clear the global sticky header (h-16, z-50) */
    <div
      className="fixed top-16 left-0 right-0 z-40 border-b border-hairline bg-canvas/95 backdrop-blur-md transition-transform duration-300"
      style={{ transform: visible ? 'translateY(0)' : 'translateY(-100%)' }}
      aria-hidden={!visible}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-4">
        {/* Back link */}
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-ink-muted hover:text-navy text-xs font-bold uppercase tracking-widest transition-colors shrink-0"
          tabIndex={visible ? 0 : -1}
        >
          <ArrowLeft size={13} className="rtl:rotate-180" />
          <span className="hidden sm:inline">All Services</span>
        </Link>

        {/* Service name — gradient matches CTA */}
        <span
          className="text-xl font-black tracking-tight truncate"
          style={{
            background: gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {title}
        </span>

        {/* Contextual CTA */}
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-navy text-xs font-bold uppercase tracking-widest shrink-0 hover:opacity-90 transition-opacity"
          style={{ background: gradient }}
          tabIndex={visible ? 0 : -1}
        >
          {ctaLabel} <ArrowRight size={12} className="rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
}
