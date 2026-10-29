'use client';
import { useState, useEffect } from 'react';
import { Link } from '@/i18n/routing';
import { Plus, Search, Edit, Trash2, Eye, CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { fetchList } from '@/lib/fetch-list';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setCourses(await fetchList('/api/admin/courses'));
    setLoading(false);
  };

  const deleteCourse = async (id: string, isPermanent: boolean) => {
    const msg = isPermanent
      ? 'Are you sure you want to PERMANENTLY delete this course? This will also remove all associated students, orders, and lessons. This action cannot be undone.'
      : 'Are you sure you want to move this course to the archive? It will disappear from the user and instructor interfaces.';

    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCourses();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete course');
      }
    } catch {
      alert('An unexpected error occurred');
    }
  };

  const restoreCourse = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/courses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DRAFT' }),
      });
      if (res.ok) {
        fetchCourses();
      }
    } catch {
      alert('Failed to restore course');
    }
  };

  const approveCourse = async (id: string) => {
    await fetch(`/api/admin/courses/${id}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    fetchCourses();
  };

  const rejectCourse = async (id: string) => {
    await fetch(`/api/admin/courses/${id}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reason: rejectReason }),
    });
    setRejectingId(null);
    setRejectReason('');
    fetchCourses();
  };

  const filtered = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                         c.category.toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'archived') return matchesSearch && c.status === 'DELETED';
    return matchesSearch && c.status !== 'DELETED';
  });

  const pendingCount = courses.filter(c => c.approvalStatus === 'PENDING' && c.status !== 'DELETED').length;
  const archivedCount = courses.filter(c => c.status === 'DELETED').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-navy tracking-tight">Manage Courses</h1>
          <p className="text-ink-muted text-sm mt-1">
            {courses.filter(c => c.status !== 'DELETED').length} active courses total
            {pendingCount > 0 && <span className="text-yellow-400 font-medium ml-2">({pendingCount} pending approval)</span>}
          </p>
        </div>
        <Link href="/admin/courses/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold hover:opacity-90 transition-opacity">
          <Plus size={18} /> Add Course
        </Link>
      </div>

      <div className="flex border-b border-hairline mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-4 px-6 text-sm font-medium transition-colors relative ${
            activeTab === 'active'
              ? 'text-teal-400 border-b-2 border-teal-400'
              : 'text-ink-muted hover:text-ink-muted'
          }`}
        >
          Active Courses
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`pb-4 px-6 text-sm font-medium transition-colors relative ${
            activeTab === 'archived'
              ? 'text-teal-400 border-b-2 border-teal-400'
              : 'text-ink-muted hover:text-ink-muted'
          }`}
        >
          Archive
          {archivedCount > 0 && (
            <span className="ml-2 bg-canvas-card text-ink-muted px-2 py-0.5 rounded-full text-xs">
              {archivedCount}
            </span>
          )}
        </button>
      </div>

      <div className="rounded-xl border border-hairline bg-canvas-card overflow-hidden">
        <div className="p-4 border-b border-hairline">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50 w-full pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-hairline bg-canvas-card">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Title</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Instructor</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Level</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Status</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Approval</th>
                <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((course) => (
                <tr key={course.id} className={`border-b border-hairline hover:bg-canvas-card transition-colors ${course.approvalStatus === 'PENDING' && course.status !== 'DELETED' ? 'bg-yellow-500/[0.03]' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-ink text-sm">{course.title}</div>
                    <div className="text-xs text-ink-muted">{course.category}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-muted">
                    {course.instructor ? `${course.instructor.firstName} ${course.instructor.lastName}`.trim() : <span className="text-ink-muted">No instructor</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-muted">{course.level}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      course.status === 'PUBLISHED' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                      course.status === 'DRAFT' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      course.status === 'DELETED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-canvas-card text-ink-muted border-hairline'
                    }`}>{course.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    {course.status !== 'DELETED' && course.approvalStatus === 'PENDING' ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => approveCourse(course.id)}
                          className="p-1.5 text-teal-400 hover:bg-teal-500/10 rounded-lg"
                          title="Approve"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => setRejectingId(course.id)}
                          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 ml-1">
                          <Clock size={10} className="inline mr-1" />Pending
                        </span>
                      </div>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        course.approvalStatus === 'APPROVED' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                        course.approvalStatus === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-canvas-card text-ink-muted border-hairline'
                      }`}>{course.approvalStatus || 'APPROVED'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {course.status === 'DELETED' ? (
                        <>
                          <button
                            onClick={() => restoreCourse(course.id)}
                            className="p-2 text-ink-muted hover:text-teal-400 transition-colors"
                            title="Restore course"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button
                            onClick={() => deleteCourse(course.id, true)}
                            className="p-2 text-ink-muted hover:text-red-400 transition-colors"
                            title="Delete permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          {course.status === 'PUBLISHED' ? (
                            <Link href={`/courses/${course.slug}`} className="p-2 text-ink-muted hover:text-ink transition-colors" title="Preview course"><Eye size={16} /></Link>
                          ) : (
                            <span className="p-2 text-slate-700 cursor-not-allowed" title="Publish course to preview it"><Eye size={16} /></span>
                          )}
                          <Link href={`/admin/courses/${course.id}/edit`} className="p-2 text-ink-muted hover:text-teal-400 transition-colors"><Edit size={16} /></Link>
                          <button onClick={() => deleteCourse(course.id, false)} className="p-2 text-ink-muted hover:text-red-400 transition-colors" title="Move to archive"><Trash2 size={16} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-ink-muted">
                    No {activeTab === 'archived' ? 'archived' : 'active'} courses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rejectingId && (
        <div className="fixed inset-0 bg-canvas-card backdrop-blur-sm flex items-center justify-center z-50">
          <div className="rounded-xl border border-hairline bg-canvas-alt p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-navy mb-4">Reject Course</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional, will be visible to instructor)"
              className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50 w-full mb-4 resize-none"
              rows={3}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-hairline text-ink-muted text-sm font-medium hover:bg-canvas-card transition-colors">Cancel</button>
              <button onClick={() => rejectCourse(rejectingId)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
