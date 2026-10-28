'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Star } from 'lucide-react';
import { fetchList } from '@/lib/fetch-list';

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', role: '', content: '', rating: 5, featured: false });

  useEffect(() => { fetchTestimonials(); }, []);

  const fetchTestimonials = async () => {
    setTestimonials(await fetchList('/api/admin/testimonials'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `/api/admin/testimonials/${editing.id}` : '/api/admin/testimonials';
    const method = editing ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, rating: Number(form.rating) }) });
    if (!res.ok) {
      // Keep the form open so nothing typed is lost, and say why.
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Could not save. Please check the fields and try again.');
      return;
    }
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', role: '', content: '', rating: 5, featured: false });
    fetchTestimonials();
  };

  const deleteTestimonial = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return;
    await fetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
    fetchTestimonials();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-navy tracking-tight">Manage Testimonials</h1>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', role: '', content: '', rating: 5, featured: false }); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <Plus size={18} /> Add Testimonial
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-6 mb-8 space-y-4">
          <h2 className="font-bold text-navy">{editing ? 'Edit' : 'New'} Testimonial</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Name"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50"
              required
            />
            <input
              placeholder="Role/Title"
              value={form.role}
              onChange={e => setForm({...form, role: e.target.value})}
              className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50"
              required
            />
            <textarea
              placeholder="Content"
              value={form.content}
              onChange={e => setForm({...form, content: e.target.value})}
              className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50 md:col-span-2"
              rows={3}
              required
            />
            <select
              value={form.rating}
              onChange={e => setForm({...form, rating: Number(e.target.value)})}
              className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted focus:outline-none focus:border-teal-500/50"
            >
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Stars</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={e => setForm({...form, featured: e.target.checked})} className="accent-teal-500" /> Featured
          </label>
          <div className="flex gap-4">
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold hover:opacity-90 transition-opacity">
              {editing ? 'Save' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-hairline text-ink-muted text-sm font-medium hover:bg-canvas-card transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map(t => (
          <div key={t.id} className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-6">
            <div className="flex gap-1 mb-3">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="text-yellow-400 fill-yellow-400" size={14} />
              ))}
            </div>
            <p className="text-sm text-ink-muted mb-4">&ldquo;{t.content}&rdquo;</p>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-navy">{t.name}</div>
                <div className="text-xs text-ink-muted">{t.role}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(t); setForm(t); setShowForm(true); }} className="p-1 text-ink-muted hover:text-teal-400 transition-colors"><Edit size={14} /></button>
                <button onClick={() => deleteTestimonial(t.id)} className="p-1 text-ink-muted hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
