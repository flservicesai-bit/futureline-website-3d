'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ArrowLeft, X, FileText, Check } from 'lucide-react';
import { Link } from '@/i18n/routing';

const TEMPLATE_TYPES = ['WELCOME', 'PROPOSAL', 'FOLLOW_UP', 'CLOSING', 'THANK_YOU', 'CUSTOM'];

const AVAILABLE_VARS = [
  { key: '{{name}}', desc: 'Lead name' },
  { key: '{{email}}', desc: 'Lead email' },
  { key: '{{service}}', desc: 'Service/tour interest' },
  { key: '{{company}}', desc: 'Company name (FutureLine)' },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', type: 'WELCOME', subject: '', body: '', variables: '' });
  const [loading, setLoading] = useState(true);

  const fetchTemplates = () => {
    setLoading(true);
    fetch('/api/admin/templates').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setTemplates(data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', type: 'WELCOME', subject: '', body: '', variables: '' });
    setShowForm(true);
  };

  const openEdit = (t: any) => {
    setEditing(t);
    setForm({ name: t.name, type: t.type, subject: t.subject, body: t.body, variables: t.variables || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = editing
      ? await fetch(`/api/admin/templates/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      : await fetch('/api/admin/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
    if (!res.ok) {
      // Keep the form open so nothing typed is lost, and say why.
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Could not save. Please check the fields and try again.');
      return;
    }
    setShowForm(false);
    fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' });
    fetchTemplates();
  };

  const toggleActive = async (t: any) => {
    await fetch(`/api/admin/templates/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    fetchTemplates();
  };

  const typeColors: Record<string, string> = {
    WELCOME: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
    PROPOSAL: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    FOLLOW_UP: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    CLOSING: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    THANK_YOU: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
    CUSTOM: 'bg-canvas-card border-hairline text-ink-muted',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/leads" className="text-ink-muted hover:text-navy transition-colors"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-black text-navy tracking-tight">Email Templates</h1>
            <p className="text-sm text-ink-muted mt-1">Create reusable message templates for your funnel</p>
          </div>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold hover:opacity-90 transition-opacity">
          <Plus size={16} /> New Template
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
        <h4 className="text-sm font-semibold text-blue-400 mb-2">Available Variables</h4>
        <div className="flex flex-wrap gap-3">
          {AVAILABLE_VARS.map(v => (
            <div key={v.key} className="bg-canvas-card border border-hairline rounded-lg px-3 py-1.5 text-sm">
              <code className="text-teal-400 font-mono text-xs">{v.key}</code>
              <span className="text-ink-muted ml-2 text-xs">{v.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-navy">{editing ? 'Edit Template' : 'New Template'}</h3>
            <button onClick={() => setShowForm(false)} className="text-ink-muted hover:text-navy transition-colors"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Template Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50" placeholder="e.g. Welcome Email" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted focus:outline-none focus:border-teal-500/50">
                  {TEMPLATE_TYPES.map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Subject Line</label>
              <input type="text" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50" placeholder="e.g. Hi {{name}}, here's your personalised offer" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Message Body</label>
              <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="w-full bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50" rows={8}
                placeholder="Dear {{name}},&#10;&#10;Thank you for your interest in {{service}}...&#10;&#10;Best regards,&#10;FutureLine Team" required />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-hairline text-ink-muted text-sm font-medium hover:bg-canvas-card transition-colors">Cancel</button>
              <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold hover:opacity-90 transition-opacity">{editing ? 'Update' : 'Create'} Template</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {templates.map(t => (
          <div key={t.id} className={`rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-5 ${!t.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-navy">{t.name}</h3>
                  <span className={`px-2 py-0.5 rounded-lg border text-xs font-medium ${typeColors[t.type] || typeColors.CUSTOM}`}>
                    {t.type.replace('_', ' ')}
                  </span>
                  {!t.isActive && <span className="px-2 py-0.5 rounded-lg border border-hairline text-xs bg-canvas-card text-ink-muted">Inactive</span>}
                </div>
                <p className="text-sm text-ink-muted mb-1"><strong className="text-ink-muted">Subject:</strong> {t.subject}</p>
                <p className="text-sm text-ink-muted line-clamp-2">{t.body}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => toggleActive(t)} className={`p-1.5 rounded-lg transition-colors ${t.isActive ? 'text-teal-400 hover:bg-teal-500/10' : 'text-ink-muted hover:bg-canvas-card'}`} title={t.isActive ? 'Deactivate' : 'Activate'}>
                  <Check size={16} />
                </button>
                <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-ink-muted hover:bg-canvas-card hover:text-navy transition-colors"><Edit2 size={16} /></button>
                <button onClick={() => deleteTemplate(t.id)} className="p-1.5 rounded-lg text-ink-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && !loading && (
          <div className="text-center py-12 text-ink-muted">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p>No templates yet. Create your first template to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
