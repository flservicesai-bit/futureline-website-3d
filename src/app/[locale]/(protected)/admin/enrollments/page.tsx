'use client';
import { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import { fetchList } from '@/lib/fetch-list';
import { downloadCsv, toCsv } from '@/lib/csv';

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchList('/api/admin/enrollments').then(setEnrollments);
  }, []);

  const filtered = enrollments.filter(e =>
    `${e.user?.firstName || ''} ${e.user?.lastName || ''}`.toLowerCase().includes(search.toLowerCase()) ||
    e.course?.title?.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ['Student Name', 'Email', 'Course', 'Progress', 'Completed', 'Date'];
    const rows = filtered.map(e => [
      `${e.user?.firstName || ''} ${e.user?.lastName || ''}`.trim(), e.user?.email, e.course?.title,
      `${Math.round(e.progressPercentage)}%`, e.completed ? 'Yes' : 'No',
      new Date(e.createdAt).toLocaleDateString('en-GB'),
    ]);
    downloadCsv('enrollments.csv', toCsv(headers, rows));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-navy tracking-tight">Enrollments</h1>
        <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-hairline text-ink-muted text-sm font-medium hover:bg-canvas-card transition-colors">
          <Download size={18} /> Export CSV
        </button>
      </div>
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
              <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Student</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Course</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Progress</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Status</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-b border-hairline hover:bg-canvas-card transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-ink">{e.user?.firstName} {e.user?.lastName}</div>
                  <div className="text-xs text-ink-muted">{e.user?.email}</div>
                </td>
                <td className="px-6 py-4 text-sm text-ink-muted">{e.course?.title}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-canvas-card rounded-full h-2">
                      <div className="bg-teal-500 rounded-full h-2" style={{ width: `${e.progressPercentage}%` }} />
                    </div>
                    <span className="text-xs text-ink-muted">{Math.round(e.progressPercentage)}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    e.completed
                      ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {e.completed ? 'Completed' : 'In Progress'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-muted">{new Date(e.createdAt).toLocaleDateString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
