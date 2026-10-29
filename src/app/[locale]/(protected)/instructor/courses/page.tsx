'use client';
import { useState, useEffect } from 'react';
import { Link } from '@/i18n/routing';
import { Plus, Search, Edit, Trash2, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { fetchList } from '@/lib/fetch-list';

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    setCourses(await fetchList('/api/instructor/courses'));
    setLoading(false);
  };

  const togglePublish = async (course: any) => {
    const newStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const res = await fetch(`/api/instructor/courses/${course.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchCourses();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
      }
    } catch {
      alert('An unexpected error occurred');
    }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to move this course to the archive? It will be hidden from the public and your main dashboard.')) return;
    try {
      const res = await fetch(`/api/instructor/courses/${id}`, { method: 'DELETE' });
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

  const filtered = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                         c.category.toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'archived') return matchesSearch && c.status === 'DELETED';
    return matchesSearch && c.status !== 'DELETED';
  });

  const archivedCount = courses.filter(c => c.status === 'DELETED').length;

  const approvalBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return (
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center gap-1">
          <CheckCircle size={12} /> Approved
        </span>
      );
      case 'REJECTED': return (
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-1">
          <XCircle size={12} /> Rejected
        </span>
      );
      default: return (
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center gap-1">
          <Clock size={12} /> Pending
        </span>
      );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-navy tracking-tight">My Courses</h1>
          <p className="text-ink-muted mt-1 text-sm">{courses.length} courses</p>
        </div>
        <Link href="/instructor/courses/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold hover:opacity-90 transition-opacity">
          <Plus size={18} /> Create Course
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={16} />
            <input
              type="text"
              placeholder="Search your courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-canvas-card border border-hairline rounded-lg pl-9 pr-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-hairline bg-canvas-card">
              <tr>
                <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Title</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Students</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Lessons</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Status</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Approval</th>
                <th className="text-right px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-ink-muted text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-ink-muted text-sm">No courses found</td></tr>
              ) : (
                filtered.map((course) => (
                  <tr key={course.id} className="border-b border-hairline hover:bg-canvas-card">
                    <td className="px-6 py-4">
                      <div className="font-medium text-navy text-sm">{course.title}</div>
                      <div className="text-xs text-ink-muted">{course.category}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-muted">{course._count?.enrollments || 0}</td>
                    <td className="px-6 py-4 text-sm text-ink-muted">{course._count?.lessons || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full w-fit border ${
                          course.status === 'PUBLISHED' ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' :
                          course.status === 'DRAFT' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                          course.status === 'DELETED' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                          'bg-canvas-card border-hairline text-ink-muted'
                        }`}>{course.status}</span>
                        {activeTab !== 'archived' && course.approvalStatus === 'APPROVED' && (
                          <button
                            onClick={() => togglePublish(course)}
                            className={`text-[10px] font-bold uppercase tracking-wider hover:underline ${
                              course.status === 'PUBLISHED' ? 'text-yellow-400' : 'text-teal-400'
                            }`}
                          >
                            {course.status === 'PUBLISHED' ? 'Unpublish' : 'Publish Now'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">{approvalBadge(course.approvalStatus)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === 'archived' ? (
                          <span className="text-xs text-ink-muted italic">Hidden in archive</span>
                        ) : (
                          <>
                            {course.status === 'PUBLISHED' ? (
                              <Link href={`/courses/${course.slug}`} className="p-2 text-ink-muted hover:text-navy transition-colors" title="Preview course">
                                <Eye size={16} />
                              </Link>
                            ) : (
                              <span className="p-2 text-slate-700 cursor-not-allowed" title="Publish course to preview it">
                                <Eye size={16} />
                              </span>
                            )}
                            <Link href={`/instructor/courses/${course.id}/edit`} className="p-2 text-ink-muted hover:text-teal-400 transition-colors" title="Edit course">
                              <Edit size={16} />
                            </Link>
                            <button onClick={() => deleteCourse(course.id)} className="p-2 text-ink-muted hover:text-red-400 transition-colors" title="Move to archive"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {courses.some(c => c.approvalStatus === 'REJECTED') && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-2">Rejected Courses</h3>
          {courses.filter(c => c.approvalStatus === 'REJECTED').map(c => (
            <div key={c.id} className="text-sm text-red-400 mb-1">
              <strong>{c.title}</strong>
              {c.rejectionReason && <span className="text-red-400/70"> - {c.rejectionReason}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
