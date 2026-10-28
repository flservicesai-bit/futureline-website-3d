'use client';
import { Fragment, useRef, useState, useEffect } from 'react';
import { Search, Users, BookOpen, ToggleLeft, ToggleRight, Percent, Save, Pencil, UserPlus, X, Upload } from 'lucide-react';
import { fetchList } from '@/lib/fetch-list';

// Shared image-upload helper. Posts the file to /api/admin/upload-image
// (admin-only multipart endpoint) and returns the public URL. Throws
// on failure so callers can surface a clean error.
async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  if (typeof data.url !== 'string') throw new Error('Upload returned no URL');
  return data.url;
}

interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bio: string | null;
  image: string | null;
  commissionRate: number;
  isActive: boolean;
  createdAt: string;
  _count: { courses: number };
  totalStudents: number;
}

// Shape of the Add-Practitioner modal form state.
type NewPractitionerForm = {
  firstName: string;
  lastName: string;
  email: string;
  image: string;
  bio: string;
};

const EMPTY_NEW_FORM: NewPractitionerForm = {
  firstName: '',
  lastName: '',
  email: '',
  image: '',
  bio: '',
};

export default function AdminInstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(70);
  const [saving, setSaving] = useState(false);
  // Bio + image editor — separate state from the commission editor
  // so admin can have both open on different rows without clobbering
  // each other. Bio and image are edited together since they're the
  // two profile-display fields used by the public "Who teaches" band.
  const [editingBioId, setEditingBioId] = useState<string | null>(null);
  const [editBio, setEditBio] = useState<string>('');
  const [editImage, setEditImage] = useState<string>('');
  const [savingBio, setSavingBio] = useState(false);

  // Add-Practitioner modal state.
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<NewPractitionerForm>(EMPTY_NEW_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addUploading, setAddUploading] = useState(false);
  const addFileRef = useRef<HTMLInputElement>(null);

  // Bio editor upload (separate state so the two file pickers don't
  // share status — admin could in theory be uploading for one row
  // while reviewing another).
  const [bioUploading, setBioUploading] = useState(false);
  const bioFileRef = useRef<HTMLInputElement>(null);

  const handleAddFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddUploading(true);
    setAddError(null);
    try {
      const url = await uploadImage(file);
      setAddForm((prev) => ({ ...prev, image: url }));
    } catch (err: any) {
      setAddError(err?.message ?? 'Upload failed');
    } finally {
      setAddUploading(false);
      if (addFileRef.current) addFileRef.current.value = '';
    }
  };

  const handleBioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBioUploading(true);
    try {
      const url = await uploadImage(file);
      setEditImage(url);
    } catch (err: any) {
      alert(err?.message ?? 'Upload failed');
    } finally {
      setBioUploading(false);
      if (bioFileRef.current) bioFileRef.current.value = '';
    }
  };

  const openAddModal = () => {
    setAddForm(EMPTY_NEW_FORM);
    setAddError(null);
    setAddOpen(true);
  };
  const closeAddModal = () => {
    if (addSaving) return; // don't close mid-save
    setAddOpen(false);
    setAddError(null);
  };
  const updateAddField = (field: keyof NewPractitionerForm, value: string) => {
    setAddForm((prev) => ({ ...prev, [field]: value }));
  };
  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    setAddError(null);
    try {
      const res = await fetch('/api/admin/instructors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAddError(body.error ?? 'Failed to add practitioner.');
        return;
      }
      closeAddModal();
      fetchInstructors();
    } catch {
      setAddError('Network error. Please try again.');
    } finally {
      setAddSaving(false);
    }
  };

  useEffect(() => { fetchInstructors(); }, []);

  const fetchInstructors = async () => {
    setInstructors(await fetchList('/api/admin/instructors'));
    setLoading(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await fetch(`/api/admin/instructors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentStatus }),
    });
    fetchInstructors();
  };

  const saveCommission = async (id: string) => {
    setSaving(true);
    await fetch(`/api/admin/instructors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commissionRate: editRate }),
    });
    setEditingId(null);
    fetchInstructors();
    setSaving(false);
  };

  const openBioEditor = (instructor: Instructor) => {
    setEditingBioId(instructor.id);
    setEditBio(instructor.bio ?? '');
    setEditImage(instructor.image ?? '');
  };

  const cancelBioEditor = () => {
    setEditingBioId(null);
    setEditBio('');
    setEditImage('');
  };

  const saveBio = async (id: string) => {
    setSavingBio(true);
    // Empty string → null so the column stays clean (Prisma writes null
    // for an empty string, but the explicit cast makes intent obvious).
    const nextBio = editBio.trim() === '' ? null : editBio.trim();
    const nextImage = editImage.trim() === '' ? null : editImage.trim();
    await fetch(`/api/admin/instructors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio: nextBio, image: nextImage }),
    });
    setEditingBioId(null);
    setEditBio('');
    setEditImage('');
    fetchInstructors();
    setSavingBio(false);
  };

  const filtered = instructors.filter(i =>
    `${i.firstName} ${i.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-navy tracking-tight">Manage Instructors</h1>
          <p className="text-ink-muted text-sm mt-1">{instructors.length} instructors</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-lg border border-teal-500/40 bg-teal-500/15 px-4 py-2 text-sm font-bold uppercase tracking-widest text-teal-300 hover:bg-teal-500/25 transition-colors"
        >
          <UserPlus size={16} />
          Add Practitioner
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <Users size={24} className="text-teal-400" />
            </div>
            <div>
              <div className="text-3xl font-black text-navy">{instructors.length}</div>
              <div className="text-sm text-ink-muted">Total Instructors</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <BookOpen size={24} className="text-teal-400" />
            </div>
            <div>
              <div className="text-3xl font-black text-navy">
                {instructors.reduce((sum, i) => sum + i._count.courses, 0)}
              </div>
              <div className="text-sm text-ink-muted">Total Courses</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <Percent size={24} className="text-teal-400" />
            </div>
            <div>
              <div className="text-3xl font-black text-navy">
                {instructors.length > 0 ? Math.round(instructors.reduce((sum, i) => sum + i.commissionRate, 0) / instructors.length) : 0}%
              </div>
              <div className="text-sm text-ink-muted">Avg. Instructor Share</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-hairline bg-canvas-card overflow-hidden">
        <div className="p-4 border-b border-hairline">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
            <input
              type="text"
              placeholder="Search instructors..."
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
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Instructor</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Courses</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Students</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Revenue Split</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Status</th>
                <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-ink-muted">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-ink-muted">No instructors found</td></tr>
              ) : (
                filtered.map((instructor) => (
                  <Fragment key={instructor.id}>
                  <tr className="border-b border-hairline hover:bg-canvas-card transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink text-sm">{instructor.firstName} {instructor.lastName}</div>
                      <div className="text-xs text-ink-muted">{instructor.email}</div>
                      {/* Bio summary line — shows current bio (truncated) or
                          a placeholder. Click to expand the inline editor. */}
                      <button
                        type="button"
                        onClick={() => openBioEditor(instructor)}
                        className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-ink-muted hover:text-teal-400 transition-colors group"
                      >
                        <Pencil size={11} className="flex-shrink-0 opacity-60 group-hover:opacity-100" />
                        {instructor.bio
                          ? <span className="italic">{instructor.bio.length > 60 ? instructor.bio.slice(0, 60).trim() + '…' : instructor.bio}</span>
                          : <span className="uppercase tracking-widest font-bold">Add bio</span>}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-muted">{instructor._count.courses}</td>
                    <td className="px-6 py-4 text-sm text-ink-muted">{instructor.totalStudents}</td>
                    <td className="px-6 py-4">
                      {editingId === instructor.id ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-ink-muted">Instructor:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editRate}
                              onChange={e => setEditRate(Number(e.target.value))}
                              className="bg-canvas-card border border-hairline rounded-lg px-2 py-1 text-sm text-ink-muted focus:outline-none focus:border-teal-500/50 w-16"
                            />
                            <span className="text-xs text-ink-muted">%</span>
                          </div>
                          <span className="text-xs text-ink-muted">You: {100 - editRate}%</span>
                          <button
                            onClick={() => saveCommission(instructor.id)}
                            disabled={saving}
                            className="p-1 text-teal-400 hover:bg-teal-500/10 rounded"
                          >
                            <Save size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingId(instructor.id); setEditRate(instructor.commissionRate); }}
                          className="text-sm text-ink-muted hover:text-ink transition-colors"
                        >
                          <span className="font-medium text-teal-400">{instructor.commissionRate}%</span>
                          <span className="text-ink-muted"> / </span>
                          <span className="text-ink-muted">{100 - instructor.commissionRate}% platform</span>
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        instructor.isActive
                          ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {instructor.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleActive(instructor.id, instructor.isActive)}
                        className={`p-2 rounded-lg transition-colors ${instructor.isActive ? 'text-teal-400 hover:bg-teal-500/10' : 'text-ink-muted hover:bg-canvas-card'}`}
                        title={instructor.isActive ? 'Disable instructor' : 'Enable instructor'}
                      >
                        {instructor.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                    </td>
                  </tr>
                  {/* Bio editor sub-row — only renders when this row's bio
                      is being edited. Full-width colspan textarea + Save /
                      Cancel. Used in the home-page "Who teaches" band on
                      /courses, and surfaces nowhere else. */}
                  {editingBioId === instructor.id && (
                    <tr className="border-b border-hairline bg-canvas-card">
                      <td colSpan={6} className="px-6 py-5">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-[160px_1fr]">
                          {/* Left: profile photo — upload OR paste URL,
                              with live preview. */}
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
                              Profile photo
                            </label>
                            {/* Live preview — falls back to a soft hint when the
                                URL is empty or fails to load. */}
                            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border border-hairline bg-canvas-card">
                              {editImage.trim() ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={editImage}
                                  alt="Preview"
                                  className="h-full w-full object-cover"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }}
                                />
                              ) : (
                                <span className="text-[11px] text-ink-muted">Preview</span>
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <input
                                ref={bioFileRef}
                                type="file"
                                accept="image/*"
                                onChange={handleBioFileChange}
                                className="hidden"
                                id={`bio-file-${instructor.id}`}
                              />
                              <button
                                type="button"
                                onClick={() => bioFileRef.current?.click()}
                                disabled={bioUploading}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-canvas-card px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:bg-canvas-card hover:text-navy transition-colors disabled:opacity-50"
                              >
                                <Upload size={11} />
                                {bioUploading ? 'Uploading…' : 'Upload'}
                              </button>
                              {editImage.trim() && !bioUploading && (
                                <button
                                  type="button"
                                  onClick={() => setEditImage('')}
                                  className="text-[11px] text-ink-muted hover:text-ink-muted transition-colors"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                            {/* type="text" not "url" — browser url-type
                                validation rejects the relative paths
                                our upload endpoint returns (e.g.
                                /uploads/instructors/abc.jpg). The field
                                still accepts full https:// URLs too. */}
                            <input
                              type="text"
                              value={editImage}
                              onChange={(e) => setEditImage(e.target.value)}
                              placeholder="…or paste a URL"
                              className="mt-2 w-full bg-canvas-card border border-hairline rounded-lg px-2.5 py-1.5 text-[11px] text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50"
                            />
                          </div>
                          {/* Right: bio textarea. */}
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
                              Bio
                            </label>
                            <textarea
                              value={editBio}
                              onChange={(e) => setEditBio(e.target.value)}
                              placeholder="e.g. AI Lead, ex-OmanTel. Built X for Y, Z, A. 8 years shipping production ML for clients in the region."
                              rows={6}
                              maxLength={2000}
                              className="w-full bg-canvas-card border border-hairline rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50 resize-y"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-4">
                          <p className="text-[11px] text-ink-muted">
                            Shows in the <span className="text-ink-muted">&quot;Who teaches&quot;</span> band on /courses. 1–2 sentences + a photo reads strongest.
                            <span className="ml-2 text-ink-muted">{editBio.length}/2000</span>
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={cancelBioEditor}
                              disabled={savingBio}
                              className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-ink-muted hover:text-ink transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveBio(instructor.id)}
                              disabled={savingBio}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 border border-teal-500/40 text-teal-400 text-xs font-bold uppercase tracking-widest hover:bg-teal-500/25 transition-colors disabled:opacity-50"
                            >
                              <Save size={13} />
                              {savingBio ? 'Saving…' : 'Save profile'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">Revenue Split Guide</h3>
        <p className="text-sm text-ink-muted">
          The commission rate shows how much of each course sale goes to the instructor.
          For example, if set to 70%, the instructor receives 70% and FutureLine keeps 30%.
          This will apply when paid courses are enabled.
        </p>
      </div>

      {/* ── Add Practitioner modal ──────────────────────────────────
          Simple form for the critical fields: name, email, profile
          photo, bio. Role + password are handled server-side (role is
          forced to INSTRUCTOR; password is a hashed random secret —
          admin doesn't need to manage it). Backdrop click + Cancel
          both dismiss. Submitting closes the modal and refreshes the
          list. */}
      {addOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-practitioner-title"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <div
            onClick={closeAddModal}
            className="absolute inset-0 bg-canvas-card backdrop-blur-sm"
            aria-hidden="true"
          />
          {/* Panel */}
          <form
            onSubmit={submitAdd}
            className="relative z-10 mx-4 w-full max-w-lg rounded-xl border border-hairline bg-slate-950 p-7 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.6)]"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="add-practitioner-title" className="text-xl font-black tracking-tight text-navy">
                  Add Practitioner
                </h2>
                <p className="mt-1 text-xs text-ink-muted">
                  Creates a new instructor record that surfaces in the public &quot;Who teaches&quot; band on /courses.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                disabled={addSaving}
                aria-label="Close"
                className="p-1.5 text-ink-muted hover:text-navy transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="np-first" className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1.5">
                  First name *
                </label>
                <input
                  id="np-first"
                  type="text"
                  value={addForm.firstName}
                  onChange={(e) => updateAddField('firstName', e.target.value)}
                  required
                  maxLength={50}
                  className="w-full rounded-lg border border-hairline bg-canvas-card px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-teal-500/50 focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="np-last" className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1.5">
                  Last name *
                </label>
                <input
                  id="np-last"
                  type="text"
                  value={addForm.lastName}
                  onChange={(e) => updateAddField('lastName', e.target.value)}
                  required
                  maxLength={50}
                  className="w-full rounded-lg border border-hairline bg-canvas-card px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-teal-500/50 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="np-email" className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1.5">
                  Email <span className="text-ink-muted font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  id="np-email"
                  type="email"
                  value={addForm.email}
                  onChange={(e) => updateAddField('email', e.target.value)}
                  className="w-full rounded-lg border border-hairline bg-canvas-card px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-teal-500/50 focus:outline-none"
                  placeholder="sarah@example.com"
                />
                <p className="mt-1 text-[10px] text-ink-muted">Used as the login email if they ever need to sign in. Leave blank to skip.</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1.5">
                  Profile photo
                </label>
                <div className="flex flex-wrap items-start gap-3">
                  {/* Live preview thumbnail */}
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-hairline bg-canvas-card">
                    {addForm.image.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={addForm.image}
                        alt="Preview"
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }}
                      />
                    ) : (
                      <span className="text-[10px] text-ink-muted">Preview</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Upload button — triggers hidden file input */}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={addFileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAddFileChange}
                        className="hidden"
                        id="np-file"
                      />
                      <button
                        type="button"
                        onClick={() => addFileRef.current?.click()}
                        disabled={addUploading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-canvas-card px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-ink-muted hover:bg-canvas-card hover:text-navy transition-colors disabled:opacity-50"
                      >
                        <Upload size={12} />
                        {addUploading ? 'Uploading…' : 'Upload photo'}
                      </button>
                      {addForm.image.trim() && !addUploading && (
                        <button
                          type="button"
                          onClick={() => updateAddField('image', '')}
                          className="text-[11px] text-ink-muted hover:text-ink-muted transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {/* Optional URL field — for admins who'd rather paste.
                        type="text" not "url" because the browser's url
                        validation rejects the relative paths our upload
                        endpoint returns (e.g. /uploads/instructors/abc.jpg).
                        Still accepts full https:// URLs. */}
                    <input
                      id="np-image"
                      type="text"
                      value={addForm.image}
                      onChange={(e) => updateAddField('image', e.target.value)}
                      className="w-full rounded-lg border border-hairline bg-canvas-card px-3 py-1.5 text-xs text-ink-muted placeholder:text-ink-muted focus:border-teal-500/50 focus:outline-none"
                      placeholder="…or paste a hosted URL"
                    />
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-ink-muted">JPG, PNG, WebP, or GIF · max 5 MB</p>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="np-bio" className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1.5">
                  Bio
                </label>
                <textarea
                  id="np-bio"
                  value={addForm.bio}
                  onChange={(e) => updateAddField('bio', e.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="w-full rounded-lg border border-hairline bg-canvas-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-teal-500/50 focus:outline-none resize-y"
                  placeholder="1–2 sentences with employer + a credential reads strongest."
                />
                <p className="mt-1 text-[10px] text-ink-muted">{addForm.bio.length}/2000</p>
              </div>
            </div>

            {addError && (
              <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {addError}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeAddModal}
                disabled={addSaving}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-muted hover:text-ink transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addSaving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/15 px-4 py-2 text-xs font-bold uppercase tracking-widest text-teal-300 hover:bg-teal-500/25 transition-colors disabled:opacity-50"
              >
                <UserPlus size={13} />
                {addSaving ? 'Adding…' : 'Add Practitioner'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
