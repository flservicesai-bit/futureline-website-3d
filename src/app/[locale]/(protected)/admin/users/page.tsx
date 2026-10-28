'use client';
import { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Check, X } from 'lucide-react';
import { fetchList } from '@/lib/fetch-list';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setUsers(await fetchList('/api/admin/users'));
  };

  const updateRole = async (id: string) => {
    const user = users.find(u => u.id === id);
    await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, role: editRole }),
    });
    setEditingId(null);
    fetchUsers();
  };

  const updateCommissionRate = async (id: string) => {
    setSavingRate(true);
    const user = users.find(u => u.id === id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, commissionRate: parseFloat(editRateValue) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Could not save the commission rate.');
      setSavingRate(false);
      return;
    }
    setEditingRateId(null);
    setSavingRate(false);
    fetchUsers();
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    fetchUsers();
  };

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-2xl font-black text-navy tracking-tight mb-8">Manage Users</h1>
      <div className="rounded-xl border border-hairline bg-canvas-card overflow-hidden">
        <div className="p-4 border-b border-hairline">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50 w-full pl-9"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-hairline bg-canvas-card">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Name</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Email</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Role</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Commission</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Joined</th>
                <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-hairline hover:bg-canvas-card transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-ink">{u.firstName} {u.lastName}</td>
                  <td className="px-6 py-4 text-sm text-ink-muted">{u.email}</td>
                  <td className="px-6 py-4">
                    {editingId === u.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value)}
                          className="bg-canvas-card border border-hairline rounded-lg px-2 py-1 text-xs text-ink-muted focus:outline-none focus:border-teal-500/50 w-32"
                        >
                          <option value="CUSTOMER">Customer</option>
                          <option value="INSTRUCTOR">Instructor</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <button onClick={() => updateRole(u.id)} className="text-xs text-teal-400 font-semibold">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-ink-muted">Cancel</button>
                      </div>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        u.role === 'INSTRUCTOR' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-teal-500/10 text-teal-400 border-teal-500/20'
                      }`}>{u.role}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {u.role === 'INSTRUCTOR' ? (
                      editingRateId === u.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editRateValue}
                            onChange={e => setEditRateValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') updateCommissionRate(u.id);
                              if (e.key === 'Escape') setEditingRateId(null);
                            }}
                            className="bg-canvas-card border border-hairline rounded-lg px-2 py-0.5 text-xs text-ink-muted focus:outline-none focus:border-teal-500/50 w-16"
                            autoFocus
                          />
                          <span className="text-xs text-ink-muted">%</span>
                          <button onClick={() => updateCommissionRate(u.id)} disabled={savingRate} className="p-1 text-teal-400 hover:bg-teal-500/10 rounded">
                            <Check size={12} />
                          </button>
                          <button onClick={() => setEditingRateId(null)} className="p-1 text-ink-muted hover:text-ink-muted rounded">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingRateId(u.id); setEditRateValue(String(u.commissionRate ?? 70)); }}
                          className="text-xs font-semibold text-teal-400 hover:underline"
                          title="Click to edit commission rate"
                        >
                          {u.commissionRate ?? 70}%
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-muted">{new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { setEditingId(u.id); setEditRole(u.role); }} className="p-2 text-ink-muted hover:text-teal-400 transition-colors"><Edit size={16} /></button>
                    <button onClick={() => deleteUser(u.id)} className="p-2 text-ink-muted hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
