/**
 * VideoEffectsClient — client-side upload + effect picker + result
 * preview. Talks to /api/video-effects/process for the actual FFmpeg
 * pipeline; this component is purely state, validation, and UI.
 *
 * State machine:
 *   idle            → user hasn't picked a file yet
 *   ready           → file picked + effect selected, ready to submit
 *   processing      → POST in flight; show spinner + cancel button
 *   done            → processed video URL received; preview + download
 *   error           → server returned an error or upload failed
 *
 * The component intentionally renders the input preview AND the
 * output preview side-by-side once done so the user can A/B them.
 */
'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, Sparkles, Download, X, Film, RotateCcw } from 'lucide-react';

// Labels and descriptions live in messages (videoLab.effects.<id>).
const EFFECTS = ['glow', 'neon', 'dark', 'vintage'] as const;

type EffectId = (typeof EFFECTS)[number];

type Status = 'idle' | 'ready' | 'processing' | 'done' | 'error';

const MAX_BYTES = 50 * 1024 * 1024;

export function VideoEffectsClient() {
  const t = useTranslations('videoLab');
  const [file, setFile] = useState<File | null>(null);
  const [inputPreviewUrl, setInputPreviewUrl] = useState<string>('');
  const [effect, setEffect] = useState<EffectId>('glow');
  const [status, setStatus] = useState<Status>('idle');
  const [resultUrl, setResultUrl] = useState<string>('');
  const [resultEffect, setResultEffect] = useState<EffectId | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError(t('tooLarge', { mb: MAX_BYTES / 1024 / 1024 }));
      setStatus('error');
      return;
    }
    if (!f.type.startsWith('video/')) {
      setError(t('notVideo'));
      setStatus('error');
      return;
    }
    // Revoke any previous local preview URL so we don't leak.
    if (inputPreviewUrl) URL.revokeObjectURL(inputPreviewUrl);
    setFile(f);
    setInputPreviewUrl(URL.createObjectURL(f));
    setError('');
    setResultUrl('');
    setResultEffect(null);
    setStatus('ready');
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const submit = async () => {
    if (!file) return;
    setStatus('processing');
    setError('');
    setResultUrl('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('preset', effect);
      const res = await fetch('/api/video-effects/process', {
        method: 'POST',
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? t('serverError', { status: res.status }));
        setStatus('error');
        return;
      }
      setResultUrl(body.url);
      setResultEffect(effect);
      setStatus('done');
    } catch {
      setError(t('networkError'));
      setStatus('error');
    }
  };

  const reset = () => {
    if (inputPreviewUrl) URL.revokeObjectURL(inputPreviewUrl);
    setFile(null);
    setInputPreviewUrl('');
    setResultUrl('');
    setResultEffect(null);
    setError('');
    setStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="rounded-2xl border border-hairline bg-canvas-card p-7 backdrop-blur-md md:p-10">
      {/* Step 1 — upload */}
      {status === 'idle' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-canvas-card px-6 py-16 text-center transition-colors hover:border-lab/40 hover:bg-canvas-card"
        >
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-lab/30 bg-lab/10 text-lab-ink">
            <Film size={22} />
          </div>
          <h2 className="text-xl font-semibold text-navy md:text-2xl">
            {t('dropTitle')}
          </h2>
          <p className="mt-2 max-w-md text-sm text-ink-muted">
            {t('dropHint')}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={onPickFile}
            className="hidden"
            id="video-effects-file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-lab/40 bg-lab/[0.12] px-6 py-3 text-sm font-medium text-lab-ink transition-colors hover:border-lab/70 hover:bg-lab/[0.22]"
          >
            <Upload size={14} />
            {t('choose')}
          </button>
        </div>
      )}

      {/* Step 2 — file picked, choose effect, submit */}
      {(status === 'ready' || status === 'processing') && (
        <div className="space-y-7">
          <div className="grid grid-cols-1 gap-7 md:grid-cols-[1fr_300px]">
            <video
              src={inputPreviewUrl}
              controls
              muted
              className="aspect-video w-full rounded-lg border border-hairline bg-black object-contain"
            />
            <div className="flex flex-col justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-lab-ink">
                  {t('loaded')}
                </p>
                <p className="mt-2 truncate text-sm font-medium text-navy">{file?.name}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · ${file.type}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
                disabled={status === 'processing'}
                className="inline-flex items-center gap-1.5 self-start rounded-full border border-hairline bg-canvas-card px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-hairline hover:text-navy disabled:opacity-50"
              >
                <X size={12} /> {t('chooseDifferent')}
              </button>
            </div>
          </div>

          {/* Effect picker */}
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-lab-ink">
              {t('pickLook')}
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {EFFECTS.map((id) => {
                const selected = id === effect;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={status === 'processing'}
                    onClick={() => setEffect(id)}
                    aria-pressed={selected}
                    className={[
                      'rounded-lg border p-4 text-start transition-all disabled:opacity-50',
                      selected
                        ? 'border-lab/55 bg-lab/[0.08] shadow-[0_0_0_1px_rgba(20,102,222,0.2)]'
                        : 'border-hairline bg-canvas-card hover:border-hairline',
                    ].join(' ')}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`text-sm font-semibold ${selected ? 'text-lab-ink' : 'text-navy'}`}>
                        {t(`effects.${id}.label`)}
                      </span>
                      {selected && <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-lab-ink">{t('selected')}</span>}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                      {t(`effects.${id}.description`)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ink-muted">
              {t('processingNote')}
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={status === 'processing'}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
            >
              {status === 'processing' ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
                  {t('processing')}
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  {t('apply')}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — done, show side-by-side */}
      {status === 'done' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">
                {t('before')}
              </p>
              <video
                src={inputPreviewUrl}
                controls
                muted
                className="aspect-video w-full rounded-lg border border-hairline bg-black object-contain"
              />
            </div>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-lab-ink">
                {t('after')}{resultEffect ? ` · ${t(`effects.${resultEffect}.label`)}` : ''}
              </p>
              <video
                src={resultUrl}
                controls
                autoPlay
                muted
                className="aspect-video w-full rounded-lg border border-lab/30 bg-black object-contain"
              />
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-hairline bg-canvas-card px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-hairline hover:text-navy"
            >
              <RotateCcw size={13} className="rtl:-scale-x-100" /> {t('tryAnother')}
            </button>
            <a
              href={resultUrl}
              download
              className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
            >
              <Download size={14} /> {t('download')}
            </a>
          </div>
        </div>
      )}

      {/* Error state — surfaces server message, lets user retry */}
      {status === 'error' && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-5" role="alert">
          <p className="text-sm font-medium text-red-700">
            {error || t('genericError')}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-navy"
          >
            <RotateCcw size={12} className="rtl:-scale-x-100" /> {t('startOver')}
          </button>
        </div>
      )}
    </div>
  );
}
