/**
 * BuildMockup — stylized abstract previews of built software + a
 * click-through detail modal with long-form marketing copy.
 *
 * The tiles are not real product screenshots. They're CSS-only visual
 * "atmospheres" suggesting a build TYPE (dashboard / mobile / portal
 * / crm). Clicking a tile opens a modal with full marketing copy
 * explaining how that build helps organizations.
 */
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X, Check } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

type BuildKind = 'dashboard' | 'mobile' | 'portal' | 'crm';

export interface BuildTileData {
  title: string;
  subtitle: string;
  industry: string;
  kind: BuildKind;
  detail?: {
    lead: string;
    whoItsFor: string;
    replaces: string;
    features: string[];
    results: string[];
  };
}

// ── Mockup compositions ──────────────────────────────────────────────

function ChromeBar() {
  return (
    <div className="mb-4 flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-canvas-card" />
      <span className="h-2 w-2 rounded-full bg-canvas-card" />
      <span className="h-2 w-2 rounded-full bg-canvas-card" />
      <span className="ml-2 h-2 flex-1 rounded-full bg-canvas-card" />
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="flex h-full flex-col">
      <ChromeBar />
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded border border-hairline bg-canvas-card px-2 py-2"
          >
            <span className="block h-1 w-6 rounded-full bg-lab/60" />
            <span className="mt-1.5 block h-2 w-8 rounded-sm bg-canvas-card" />
            <span className="mt-1 block h-1 w-5 rounded-full bg-canvas-card" />
          </div>
        ))}
      </div>
      <div className="mb-3 rounded border border-hairline bg-canvas-card p-2">
        <svg viewBox="0 0 100 30" className="h-8 w-full" preserveAspectRatio="none">
          <path
            d="M0,22 Q15,18 25,20 T50,12 T75,15 T100,8"
            fill="none"
            stroke="rgb(20, 102, 222)"
            strokeWidth="1.5"
            opacity="0.85"
          />
          <path
            d="M0,22 Q15,18 25,20 T50,12 T75,15 T100,8 L100,30 L0,30 Z"
            fill="rgb(20, 102, 222)"
            opacity="0.12"
          />
        </svg>
      </div>
      <div className="space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-lab/70" />
            <span className="h-1.5 flex-1 rounded-full bg-canvas-card" />
            <span className="h-1.5 w-8 rounded-full bg-canvas-card" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileMockup() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative h-full max-h-[200px] w-[110px] overflow-hidden rounded-xl border border-hairline bg-canvas-card p-2">
        <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-canvas-card" />
        <div className="mb-2 flex items-center justify-between">
          <span className="h-1 w-4 rounded-full bg-canvas-card" />
          <span className="h-1 w-3 rounded-full bg-canvas-card" />
        </div>
        <div className="mb-2 rounded bg-canvas-card p-1.5">
          <span className="block h-1 w-12 rounded-full bg-lab/70" />
          <span className="mt-0.5 block h-1 w-8 rounded-full bg-canvas-card" />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="mb-1.5 flex items-center gap-1.5 rounded border border-hairline bg-canvas-card px-1.5 py-1"
          >
            <span className="h-2 w-2 rounded-sm bg-lab/40" />
            <div className="flex-1 space-y-0.5">
              <span className="block h-1 w-full rounded-full bg-canvas-card" />
              <span className="block h-1 w-1/2 rounded-full bg-canvas-card" />
            </div>
          </div>
        ))}
        <div className="absolute bottom-2 left-2 right-2 rounded bg-lab/80 py-1.5 text-center">
          <span className="text-[7px] font-bold uppercase tracking-widest text-black">
            Submit
          </span>
        </div>
      </div>
    </div>
  );
}

function PortalMockup() {
  const t = useTranslations('buildMockup');
  return (
    <div className="flex h-full flex-col">
      <ChromeBar />
      <div className="flex flex-1 gap-2">
        <div className="w-1/3 space-y-1.5 rounded border border-hairline bg-canvas-card p-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-lab/40" />
              <span className="h-1 flex-1 rounded-full bg-canvas-card" />
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="rounded border border-hairline bg-canvas-card p-2">
            <span className="block h-1.5 w-2/3 rounded-full bg-lab/65" />
            <span className="mt-1.5 block h-1 w-full rounded-full bg-canvas-card" />
            <span className="mt-0.5 block h-1 w-1/2 rounded-full bg-canvas-card" />
            <div className="mt-2 flex items-center gap-1.5">
              <span className="rounded-full bg-lab/15 px-1.5 py-0.5 text-[7px] font-mono uppercase tracking-widest text-lab-ink">
                {t('active')}
              </span>
              <span className="rounded-full bg-canvas-card px-1.5 py-0.5 text-[7px] font-mono uppercase tracking-widest text-ink-muted">
                {t('draft')}
              </span>
            </div>
          </div>
          <div className="rounded border border-hairline bg-canvas-card p-2">
            <span className="block h-1 w-1/2 rounded-full bg-canvas-card" />
            <span className="mt-1 block h-1 w-full rounded-full bg-canvas-card" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CrmMockup() {
  return (
    <div className="flex h-full flex-col">
      <ChromeBar />
      <div className="mb-2 flex items-center gap-3 border-b border-hairline pb-1">
        <span className="block h-1 w-8 rounded-full bg-lab" />
        <span className="block h-1 w-6 rounded-full bg-canvas-card" />
        <span className="block h-1 w-7 rounded-full bg-canvas-card" />
      </div>
      <div className="flex-1 space-y-1.5">
        {[
          { status: 'active' },
          { status: 'pending' },
          { status: 'active' },
          { status: 'closed' },
        ].map((row, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded border border-hairline bg-canvas-card px-2 py-1.5"
          >
            <span className="h-3 w-3 rounded-full bg-lab/35" />
            <div className="flex-1 space-y-0.5">
              <span className="block h-1 w-1/2 rounded-full bg-canvas-card" />
              <span className="block h-1 w-1/3 rounded-full bg-canvas-card" />
            </div>
            <span
              className={[
                'rounded-full px-1.5 py-0.5 text-[6px] font-mono uppercase tracking-widest',
                row.status === 'active'
                  ? 'bg-lab/15 text-lab-ink'
                  : row.status === 'pending'
                    ? 'bg-amber-400/15 text-amber-400/80'
                    : 'bg-canvas-card text-ink-muted',
              ].join(' ')}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const MOCKUP_MAP: Record<BuildKind, () => React.ReactElement> = {
  dashboard: DashboardMockup,
  mobile: MobileMockup,
  portal: PortalMockup,
  crm: CrmMockup,
};

// ── BuildTile (the card itself) ──────────────────────────────────────

function BuildTileBody({
  kind,
  title,
  subtitle,
  industry,
  clickable,
}: {
  kind: BuildKind;
  title: string;
  subtitle: string;
  industry: string;
  clickable: boolean;
}) {
  const t = useTranslations('buildMockup');
  const Mockup = MOCKUP_MAP[kind];
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-hairline bg-canvas-card text-start transition-all duration-500 hover:border-lab/35 hover:bg-canvas-card">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(20, 102, 222, 0.75) 50%, transparent 100%)',
        }}
      />
      <div
        aria-hidden
        className="relative aspect-[16/10] overflow-hidden border-b border-hairline bg-gradient-to-br from-lab/[0.04] via-transparent to-transparent p-4"
      >
        <Mockup />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-lab-ink">
          {industry}
        </p>
        <h3 className="mt-3 text-lg font-semibold tracking-tight text-navy">
          {title}
        </h3>
        {/* Subtitle takes natural height — no flex-1. With flex-1 (flex: 1 1 0%
            = flex-shrink: 1), a row-uniform grid height + outer overflow-hidden
            could clip the last line on cards with shorter subtitles. */}
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
          {subtitle}
        </p>
        {/* mt-auto pushes the footer to the bottom of the flex container
            regardless of subtitle height — gives the column its alignment
            without putting the subtitle at flex-shrink risk. */}
        <div className="mt-auto flex items-center gap-1.5 border-t border-hairline pt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted transition-colors duration-300 group-hover:text-lab-ink">
          {clickable ? t('seeBuild') : t('customBuild')}
          <ArrowRight
            size={11}
            className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
          />
        </div>
      </div>
    </div>
  );
}

// Stand-alone (non-clickable) wrapper, kept for backward compatibility.
export function BuildTile(props: {
  kind: BuildKind;
  title: string;
  subtitle: string;
  industry: string;
}) {
  return <BuildTileBody {...props} clickable={false} />;
}

// ── Detail modal ─────────────────────────────────────────────────────

function BuildDetailModal({
  tile,
  onClose,
}: {
  tile: BuildTileData;
  onClose: () => void;
}) {
  const t = useTranslations('buildMockup');
  const Mockup = MOCKUP_MAP[tile.kind];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!tile.detail) return null;

  // Canonical scrollable-modal pattern: the OUTER wrapper is the scroll
  // container (overflow-y-auto + min-h-full inner flex centering). The
  // backdrop is part of the wrapper's background, NOT a separate button
  // element — so wheel events anywhere in the dimmed area still scroll
  // the wrapper. Click-to-close uses target === currentTarget on the
  // wrapper to avoid swallowing clicks on the panel itself.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="build-modal-title"
      // Tell Lenis (the page-level smooth-scroll lib) to ignore wheel
      // events inside the modal — otherwise Lenis intercepts the wheel
      // and there's nowhere for it to scroll (body's locked), so the
      // modal's overflow-y-auto never sees the event.
      data-lenis-prevent
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] overflow-y-auto bg-canvas-card backdrop-blur-sm"
      style={{
        animation: 'build-modal-fade-in 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="flex min-h-full items-start justify-center p-4 md:items-center md:p-8"
      >
        {/* Panel */}
        <div
          className="relative w-full max-w-3xl rounded-2xl border border-hairline bg-[#070707] shadow-[0_50px_140px_-20px_rgba(0,0,0,0.85),0_0_40px_-10px_rgba(20,102,222,0.25)]"
          style={{
            animation: 'build-modal-pop 320ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
        <button
          autoFocus
          onClick={onClose}
          aria-label={t('close')}
          data-cursor="hover"
          className="absolute end-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-canvas-card text-ink backdrop-blur-md transition-all duration-200 hover:border-hairline hover:bg-canvas-card hover:text-navy"
        >
          <X size={16} strokeWidth={2.25} />
        </button>

        {/* Hero strip — mockup + identity */}
        <div className="grid grid-cols-1 gap-6 border-b border-hairline p-7 md:grid-cols-12 md:p-10">
          <div className="md:col-span-5">
            <div
              aria-hidden
              className="aspect-[16/10] overflow-hidden rounded-lg border border-hairline bg-gradient-to-br from-lab/[0.06] via-transparent to-transparent p-4"
            >
              <Mockup />
            </div>
          </div>
          <div className="md:col-span-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-lab-ink">
              {tile.industry} · Example build
            </p>
            <h2
              id="build-modal-title"
              className="mt-3 text-2xl font-semibold tracking-tight text-navy md:text-3xl"
            >
              {tile.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink md:text-lg">
              {tile.detail.lead}
            </p>
          </div>
        </div>

        {/* Who it's for */}
        <div className="grid grid-cols-1 gap-6 border-b border-hairline p-7 md:grid-cols-12 md:p-10">
          <div className="md:col-span-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-lab-ink">
              {t('whoItsFor')}
            </p>
          </div>
          <p className="text-base leading-relaxed text-ink md:col-span-9 md:text-lg">
            {tile.detail.whoItsFor}
          </p>
        </div>

        {/* Replaces */}
        <div className="grid grid-cols-1 gap-6 border-b border-hairline p-7 md:grid-cols-12 md:p-10">
          <div className="md:col-span-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-lab-ink">
              {t('replaces')}
            </p>
          </div>
          <p className="text-base leading-relaxed text-ink md:col-span-9 md:text-lg">
            {tile.detail.replaces}
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 gap-6 border-b border-hairline p-7 md:grid-cols-12 md:p-10">
          <div className="md:col-span-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-lab-ink">
              {t('whatItDoes')}
            </p>
          </div>
          <ul className="space-y-3 md:col-span-9">
            {tile.detail.features.map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-base leading-relaxed text-ink md:text-lg"
              >
                <span
                  aria-hidden
                  className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-lab/40 bg-lab/10 text-lab-ink"
                >
                  <Check size={11} strokeWidth={2.5} />
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 gap-6 border-b border-hairline p-7 md:grid-cols-12 md:p-10">
          <div className="md:col-span-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-lab-ink">
              {t('typicalResults')}
            </p>
          </div>
          <ul className="space-y-3 md:col-span-9">
            {tile.detail.results.map((r, i) => (
              <li
                key={i}
                className="border-s-2 border-lab/40 ps-4 text-base leading-relaxed text-ink md:text-lg"
              >
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-7 md:p-10">
          <p className="max-w-md text-sm leading-relaxed text-ink-muted md:text-base">
            This is one example. Your build will be shaped around your team —
            not this template.
          </p>
          <Link
            href="/audit"
            onClick={onClose}
            data-cursor="magnetic"
            data-cursor-strength="22"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-canvas-card"
          >
            {t('freeAudit')}
            <ArrowRight size={14} className="rtl:rotate-180" />
          </Link>
        </div>
      </div>
      </div>

      <style jsx global>{`
        @keyframes build-modal-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes build-modal-pop {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}

// ── Grid wrapper (handles tile-click → modal state) ──────────────────

export function RecentBuildsGrid({ tiles }: { tiles: BuildTileData[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const active = activeIdx !== null ? tiles[activeIdx] : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile, i) => {
          const clickable = !!tile.detail;
          if (!clickable) {
            return (
              <div key={i}>
                <BuildTileBody {...tile} clickable={false} />
              </div>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              data-cursor="hover"
              className="block h-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-lab/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-xl"
              aria-label={`See the ${tile.title} build`}
            >
              <BuildTileBody {...tile} clickable />
            </button>
          );
        })}
      </div>

      {active && active.detail && (
        <BuildDetailModal tile={active} onClose={() => setActiveIdx(null)} />
      )}
    </>
  );
}
