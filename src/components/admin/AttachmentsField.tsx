'use client';
import { useRef, useState } from 'react';
import { Lock, Link2, Upload } from 'lucide-react';
import { parseAttachments } from '@/lib/attachments';

/**
 * A lesson's attachments in the Course Builder: one per line (`Name|link`).
 * "Upload file" stores the file privately (/api/lesson-files) and adds its
 * line; learners then get it through the enrolment-checked download, stamped
 * with their name. A pasted web link is shown as shareable.
 */
export default function AttachmentsField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    let next = value.trim();
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/lesson-files', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.line) {
          setError(`${file.name}: ${data.error || 'upload failed'}`);
          break;
        }
        next = next ? `${next}\n${data.line}` : data.line;
        onChange(next);
      } catch {
        setError(`${file.name}: upload failed`);
        break;
      }
    }
    setBusy(false);
    if (input.current) input.current.value = '';
  };

  const items = parseAttachments(value);
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'Attachments, one per line (optional): Name|https://… or upload a file'}
        className="input-field font-mono text-xs"
        rows={Math.min(6, Math.max(2, value.split('\n').length))}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hairline text-xs font-bold text-navy hover:bg-canvas-card disabled:opacity-50"
        >
          <Upload size={13} /> {busy ? 'Uploading…' : 'Upload file'}
        </button>
        <span className="text-[10px] text-ink-muted">PDF, TXT, MD, ZIP, PNG or JPG, up to 30 MB. Kept private; PDFs and text get the learner&apos;s name.</span>
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.zip,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((a, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[10px]">
              {a.kind === 'file' ? (
                <span className="flex items-center gap-1 text-teal-400">
                  <Lock size={11} /> {a.name}: protected, enrolled learners only
                </span>
              ) : a.kind === 'link' ? (
                <span className="flex items-center gap-1 text-amber-400">
                  <Link2 size={11} /> {a.name}: web link, anyone with it can open it
                </span>
              ) : (
                <span className="text-ink-muted">{a.name}: shown as text, not a link</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
