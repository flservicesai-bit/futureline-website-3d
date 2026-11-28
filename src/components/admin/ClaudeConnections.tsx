'use client';
import { useEffect, useState } from 'react';
import { Bot, Unplug } from 'lucide-react';

type Connection = {
  clientId: string;
  name: string;
  returnsTo: string;
  approvedBy: string | null;
  connectedAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'never';

/** Admin → Settings: Claude connector connections, each with a Revoke button. */
export default function ClaudeConnections() {
  const [rows, setRows] = useState<Connection[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    fetch('/api/admin/connections')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));

  useEffect(() => { load(); }, []);

  const revoke = async (c: Connection) => {
    if (!confirm(`Disconnect "${c.name}"? It will lose access straight away.`)) return;
    setBusy(c.clientId);
    await fetch(`/api/admin/connections?clientId=${encodeURIComponent(c.clientId)}`, { method: 'DELETE' }).catch(() => {});
    setBusy(null);
    load();
  };

  return (
    <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-6 md:col-span-2">
      <div className="flex items-center gap-2 mb-1">
        <Bot size={18} className="text-teal-400" />
        <h3 className="text-sm font-bold text-navy">Claude connector</h3>
      </div>
      <p className="text-xs text-ink-muted mb-4">
        Apps you allowed to read admin data through <code className="font-mono">/api/mcp</code>. Read-only. Changing your password also disconnects them.
      </p>

      {rows === null ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-muted">No apps connected.</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {rows.map((c) => (
            <li key={c.clientId} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-navy truncate">{c.name}</div>
                <div className="text-xs text-ink-muted">
                  {c.returnsTo && <>Returns to {c.returnsTo} · </>}
                  Approved by {c.approvedBy ?? 'unknown'} · Last used {when(c.lastUsedAt)}
                </div>
              </div>
              <button
                onClick={() => revoke(c)}
                disabled={busy !== null}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/10 disabled:opacity-40"
              >
                <Unplug size={13} /> {busy === c.clientId ? 'Revoking…' : 'Revoke'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
