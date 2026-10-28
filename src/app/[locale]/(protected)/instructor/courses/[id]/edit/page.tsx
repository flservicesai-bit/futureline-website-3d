'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';

const labelClass = 'block text-xs font-bold text-ink-muted uppercase tracking-widest mb-2';
const selectClass = 'input-field [&>option]:bg-canvas-alt';

export default function EditInstructorCoursePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isFree, setIsFree] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    fetch(`/api/instructor/courses/${params.id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(course => {
        // Not found / not yours: back to the list rather than a form of nothing.
        if (!course) { router.push('/instructor/courses'); return; }
        const free = course.price === 0;
        setIsFree(free);
        setForm({
          ...course,
          startDate: course.startDate ? new Date(course.startDate).toISOString().split('T')[0] : '',
          endDate: course.endDate ? new Date(course.endDate).toISOString().split('T')[0] : '',
          discountPrice: course.discountPrice || '',
          seatCapacity: course.seatCapacity || '',
          location: course.location || '',
          marketingVideoUrl: course.marketingVideoUrl || '',
        });
        setFetching(false);
      });
  }, [params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFreeToggle = (free: boolean) => {
    setIsFree(free);
    if (free) {
      setForm((prev: any) => ({ ...prev, price: 0, discountPrice: '' }));
    } else {
      setForm((prev: any) => ({ ...prev, price: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
        alert('End date cannot be earlier than start date');
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/instructor/courses/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: isFree ? 0 : parseFloat(form.price) || 0,
          discountPrice: (!isFree && form.discountPrice) ? parseFloat(form.discountPrice) : null,
          durationHours: parseInt(form.durationHours) || 1,
          seatCapacity: form.seatCapacity ? parseInt(form.seatCapacity) : null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          status: form.status,
        }),
      });
      if (res.ok) {
        router.push('/instructor/courses');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update course');
      }
    } catch {
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-ink-muted text-sm font-medium animate-pulse">Loading course…</div>
      </div>
    );
  }

  const canPublish = form.approvalStatus === 'APPROVED';

  return (
    <div>
      <Link href="/instructor/courses" className="inline-flex items-center gap-2 text-ink-muted hover:text-teal-400 text-xs font-bold uppercase tracking-widest mb-6 transition-colors">
        <ArrowLeft size={14} /> Back to My Courses
      </Link>
      <h1 className="text-2xl font-black text-navy tracking-tight mb-1">Edit Course</h1>
      <p className="text-ink-muted text-sm mb-8">
        {form.approvalStatus === 'PENDING'
          ? 'Your changes will be reviewed by an admin.'
          : form.approvalStatus === 'REJECTED'
          ? 'Please address the rejection reason before resubmitting.'
          : 'Course is approved and can be managed.'}
      </p>

      <form onSubmit={handleSubmit} className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-8 max-w-4xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className={labelClass}>Title</label>
            <input name="title" value={form.title || ''} onChange={handleChange} className="input-field" required />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Short Description</label>
            <textarea name="shortDescription" value={form.shortDescription || ''} onChange={handleChange} className="input-field" rows={2} required />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Full Description</label>
            <textarea name="fullDescription" value={form.fullDescription || ''} onChange={handleChange} className="input-field" rows={4} required />
          </div>

          {/* Pricing */}
          <div className="md:col-span-2">
            <label className={labelClass}>Pricing</label>
            <div className="flex gap-3 mb-4">
              <button type="button" onClick={() => handleFreeToggle(true)}
                className={`px-5 py-2 rounded-lg text-sm font-bold border transition-all ${
                  isFree ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'border-hairline text-ink-muted hover:border-hairline hover:text-ink-muted'
                }`}>Free</button>
              <button type="button" onClick={() => handleFreeToggle(false)}
                className={`px-5 py-2 rounded-lg text-sm font-bold border transition-all ${
                  !isFree ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'border-hairline text-ink-muted hover:border-hairline hover:text-ink-muted'
                }`}>Paid</button>
            </div>
            {!isFree && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1.5">Price (OMR)</label>
                  <div className="flex rounded-lg border border-hairline overflow-hidden focus-within:border-teal-500/50 bg-canvas-card">
                    <span className="px-3 border-r border-hairline flex items-center text-xs font-bold text-ink-muted whitespace-nowrap">OMR</span>
                    <input name="price" type="number" step="0.001" min="0" value={form.price || ''} onChange={handleChange}
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent text-navy placeholder:text-ink-muted"
                      placeholder="0.000" required={!isFree} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1.5">Discount Price (OMR) — optional</label>
                  <div className="flex rounded-lg border border-hairline overflow-hidden focus-within:border-teal-500/50 bg-canvas-card">
                    <span className="px-3 border-r border-hairline flex items-center text-xs font-bold text-ink-muted whitespace-nowrap">OMR</span>
                    <input name="discountPrice" type="number" step="0.001" min="0" value={form.discountPrice || ''} onChange={handleChange}
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent text-navy placeholder:text-ink-muted"
                      placeholder="0.000" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select name="status" value={form.status || ''} onChange={handleChange} className={selectClass}>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
              {canPublish && <option value="PUBLISHED">Published</option>}
            </select>
            {!canPublish && (
              <p className="text-xs text-amber-500 mt-1.5">Admin approval required to publish</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Delivery Type</label>
            <select name="deliveryType" value={form.deliveryType || ''} onChange={handleChange} className={selectClass}>
              <option value="ONLINE">Online</option>
              <option value="IN_PERSON">In-Person</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Marketing Video URL (optional)</label>
            <input name="marketingVideoUrl" value={form.marketingVideoUrl || ''} onChange={handleChange} className="input-field" placeholder="YouTube or Vimeo URL for course preview" />
            <p className="text-xs text-ink-muted mt-1.5">Paste a Vimeo or YouTube link that will display on the course detail page</p>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-hairline">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
          <Link href="/instructor/courses" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
