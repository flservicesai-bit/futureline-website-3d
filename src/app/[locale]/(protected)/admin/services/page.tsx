'use client';
import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { fetchList } from '@/lib/fetch-list';

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', pricingModel: '', featured: false, status: 'ACTIVE' });

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    setServices(await fetchList('/api/admin/services'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `/api/admin/services/${editing.id}` : '/api/admin/services';
    const method = editing ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) {
      // Keep the form open so nothing typed is lost, and say why.
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Could not save. Please check the fields and try again.');
      return;
    }
    setShowForm(false);
    setEditing(null);
    setForm({ title: '', description: '', category: '', pricingModel: '', featured: false, status: 'ACTIVE' });
    fetchServices();
  };

  const deleteService = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
    fetchServices();
  };

  const startEdit = (service: any) => {
    setForm(service);
    setEditing(service);
    setShowForm(true);
  };

  const filtered = services.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-navy tracking-tight">Manage Services</h1>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ title: '', description: '', category: '', pricingModel: '', featured: false, status: 'ACTIVE' }); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <Plus size={18} /> Add Service
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-6 mb-8 space-y-4">
          <h2 className="font-bold text-navy">{editing ? 'Edit Service' : 'New Service'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Title</label>
              <input
                name="title"
                placeholder="Title"
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50 w-full"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Category</label>
              <input
                name="category"
                placeholder="Category"
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
                className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50 w-full"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Description</label>
              <textarea
                name="description"
                placeholder="Description"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50 w-full resize-none"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Pricing Model</label>
              <input
                name="pricingModel"
                placeholder="Pricing Model"
                value={form.pricingModel}
                onChange={e => setForm({...form, pricingModel: e.target.value})}
                className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50 w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={e => setForm({...form, status: e.target.value})}
                className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted focus:outline-none focus:border-teal-500/50 w-full"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={e => setForm({...form, featured: e.target.checked})} className="accent-teal-500" />
            Featured
          </label>
          <div className="flex gap-4">
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold hover:opacity-90 transition-opacity">{editing ? 'Save' : 'Create'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-hairline text-ink-muted text-sm font-medium hover:bg-canvas-card transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-hairline bg-canvas-card overflow-hidden">
        <div className="p-4 border-b border-hairline">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50 w-full pl-9"
            />
          </div>
        </div>
        <table className="w-full">
          <thead className="border-b border-hairline bg-canvas-card">
            <tr>
              <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Title</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Category</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Status</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Featured</th>
              <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-hairline hover:bg-canvas-card transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-ink">{s.title}</td>
                <td className="px-6 py-4 text-sm text-ink-muted">{s.category}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    s.status === 'ACTIVE'
                      ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                      : 'bg-canvas-card text-ink-muted border-hairline'
                  }`}>{s.status}</span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-muted">{s.featured ? 'Yes' : 'No'}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => startEdit(s)} className="p-2 text-ink-muted hover:text-teal-400 transition-colors"><Edit size={16} /></button>
                  <button onClick={() => deleteService(s.id)} className="p-2 text-ink-muted hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-ink-muted">No services found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
