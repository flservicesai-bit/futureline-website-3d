'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, ChevronDown, ChevronRight, Trash2, Edit, Save, X, GripVertical, Video, FileText, HelpCircle, BookOpen, Check, Pencil } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fetchList } from '@/lib/fetch-list';

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

interface LessonData {
  id?: string;
  courseId: string;
  moduleTitle: string;
  lessonTitle: string;
  lessonType: 'CONTENT' | 'QUIZ';
  videoUrl: string;
  content: string;
  resources: string;
  questions: Question[];
  orderIndex: number;
}

interface Course {
  id: string;
  title: string;
}

const emptyLesson = (courseId: string, moduleTitle: string, orderIndex: number): LessonData => ({
  courseId, moduleTitle, lessonTitle: '', lessonType: 'CONTENT',
  videoUrl: '', content: '', resources: '', questions: [], orderIndex,
});

const emptyQuestion = (): Question => ({
  question: '', options: ['', '', '', ''], correctIndex: 0,
});

function parseLessonsResponse(data: any[]): LessonData[] {
  return data.map(l => ({
    id: l.id, courseId: l.courseId, moduleTitle: l.moduleTitle,
    lessonTitle: l.lessonTitle, lessonType: l.lessonType || 'CONTENT',
    videoUrl: l.videoUrl || '', content: l.content || '',
    resources: l.resources || '', questions: (l.questions as Question[]) || [],
    orderIndex: l.orderIndex,
  }));
}

function SortableLesson({
  lesson, editingLesson, editForm, setEditForm, saveLesson,
  setEditingLesson, startEdit, deleteLesson, saving,
}: {
  lesson: LessonData; editingLesson: string | null; editForm: LessonData | null;
  setEditForm: (l: LessonData | null) => void; saveLesson: (l: LessonData) => void;
  setEditingLesson: (id: string | null) => void; startEdit: (l: LessonData) => void;
  deleteLesson: (id: string) => void; saving: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id || `temp-${lesson.orderIndex}` });

  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 40 : undefined, opacity: isDragging ? 0.5 : 1 };

  if (editingLesson === lesson.id && editForm) {
    return (
      <div ref={setNodeRef} style={style}>
        <LessonForm lesson={editForm} onChange={setEditForm}
          onSave={() => saveLesson(editForm)}
          onCancel={() => { setEditingLesson(null); setEditForm(null); }}
          saving={saving} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center justify-between px-5 py-3 transition-colors ${isDragging ? 'bg-teal-500/[0.05]' : 'hover:bg-canvas-card'}`}>
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 text-ink-muted hover:text-ink-muted touch-none" title="Drag to reorder lesson">
          <GripVertical size={16} />
        </button>
        {lesson.lessonType === 'QUIZ'
          ? <HelpCircle className="text-amber-400 flex-shrink-0" size={16} />
          : <BookOpen className="text-teal-400 flex-shrink-0" size={16} />
        }
        <div>
          <span className="text-sm font-medium text-ink-muted">{lesson.lessonTitle}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest ${lesson.lessonType === 'QUIZ' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-teal-500/10 border-teal-500/20 text-teal-400'}`}>
              {lesson.lessonType}
            </span>
            {lesson.videoUrl && <span className="text-[10px] text-ink-muted flex items-center gap-0.5"><Video size={10} /> Video</span>}
            {lesson.content && <span className="text-[10px] text-ink-muted flex items-center gap-0.5"><FileText size={10} /> Notes</span>}
            {lesson.lessonType === 'QUIZ' && lesson.questions?.length > 0 && <span className="text-[10px] text-ink-muted">{lesson.questions.length} questions</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => startEdit(lesson)} className="p-2 text-ink-muted hover:text-teal-400 rounded-lg transition-colors"><Edit size={14} /></button>
        <button onClick={() => lesson.id && deleteLesson(lesson.id)} className="p-2 text-ink-muted hover:text-red-400 rounded-lg transition-colors"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function SortableModule({
  moduleName, moduleIndex, moduleLessons, isExpanded, toggleModule,
  startAddLesson, deleteModule, renameModule, editingLesson, editForm,
  setEditForm, saveLesson, setEditingLesson, startEdit, deleteLesson,
  addingTo, newLesson, setNewLesson, setAddingTo, saving, onLessonDragEnd,
}: {
  moduleName: string; moduleIndex: number; moduleLessons: LessonData[];
  isExpanded: boolean; toggleModule: (name: string) => void;
  startAddLesson: (name: string) => void; deleteModule: (name: string) => void;
  renameModule: (oldName: string, newName: string) => void;
  editingLesson: string | null; editForm: LessonData | null;
  setEditForm: (l: LessonData | null) => void; saveLesson: (l: LessonData) => void;
  setEditingLesson: (id: string | null) => void; startEdit: (l: LessonData) => void;
  deleteLesson: (id: string) => void; addingTo: string | null;
  newLesson: LessonData | null; setNewLesson: (l: LessonData | null) => void;
  setAddingTo: (s: string | null) => void; saving: boolean;
  onLessonDragEnd: (moduleName: string, event: DragEndEvent) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(moduleName);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `module-${moduleName}` });

  const lessonSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined, opacity: isDragging ? 0.8 : 1 };
  const lessonIds = moduleLessons.map(l => l.id || `temp-${l.orderIndex}`);

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== moduleName) renameModule(moduleName, trimmed);
    setIsRenaming(false);
  };

  return (
    <div ref={setNodeRef} style={style} className={`rounded-xl border overflow-hidden transition-all ${isDragging ? 'border-teal-500/30 shadow-xl shadow-teal-500/10 bg-canvas-card' : 'border-hairline bg-canvas-card backdrop-blur-sm'}`}>
      <div className="flex items-center justify-between px-5 py-4 bg-canvas-card border-b border-hairline">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-ink-muted hover:text-ink-muted touch-none flex-shrink-0" title="Drag to reorder module">
            <GripVertical size={20} />
          </button>
          {isRenaming ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') { setIsRenaming(false); setRenameValue(moduleName); } }}
                className="input-field text-sm flex-1" autoFocus />
              <button onClick={handleRenameSubmit} className="p-1.5 text-teal-400 hover:bg-teal-500/10 rounded-lg flex-shrink-0" title="Save name"><Check size={16} /></button>
              <button onClick={() => { setIsRenaming(false); setRenameValue(moduleName); }} className="p-1.5 text-ink-muted hover:text-ink-muted rounded-lg flex-shrink-0" title="Cancel"><X size={16} /></button>
            </div>
          ) : (
            <button onClick={() => toggleModule(moduleName)} className="flex items-center gap-3 text-left flex-1 min-w-0">
              {isExpanded ? <ChevronDown className="text-teal-400 flex-shrink-0" size={20} /> : <ChevronRight className="text-ink-muted flex-shrink-0" size={20} />}
              <div className="min-w-0">
                <h3 className="font-bold text-navy text-sm truncate">Module {moduleIndex + 1}: {moduleName}</h3>
                <span className="text-[11px] text-ink-muted">{moduleLessons.length} lesson{moduleLessons.length !== 1 ? 's' : ''}</span>
              </div>
            </button>
          )}
        </div>
        {!isRenaming && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => { setIsRenaming(true); setRenameValue(moduleName); }} className="p-2 text-ink-muted hover:text-ink-muted rounded-lg transition-colors" title="Rename module"><Pencil size={14} /></button>
            <button onClick={() => startAddLesson(moduleName)} className="p-2 text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors" title="Add lesson"><Plus size={16} /></button>
            <button onClick={() => deleteModule(moduleName)} className="p-2 text-ink-muted hover:text-red-400 rounded-lg transition-colors" title="Delete module"><Trash2 size={16} /></button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="divide-y divide-hairline">
          {moduleLessons.length > 0 ? (
            <DndContext sensors={lessonSensors} collisionDetection={closestCenter} onDragEnd={(event) => onLessonDragEnd(moduleName, event)}>
              <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
                {moduleLessons.map(lesson => (
                  <SortableLesson key={lesson.id || `temp-${lesson.orderIndex}`} lesson={lesson}
                    editingLesson={editingLesson} editForm={editForm} setEditForm={setEditForm}
                    saveLesson={saveLesson} setEditingLesson={setEditingLesson}
                    startEdit={startEdit} deleteLesson={deleteLesson} saving={saving} />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            !(addingTo === moduleName && newLesson) && (
              <div className="px-5 py-8 text-center text-ink-muted text-sm">
                No lessons yet.{' '}
                <button onClick={() => startAddLesson(moduleName)} className="text-teal-400 hover:underline">Add one</button>
              </div>
            )
          )}
          {addingTo === moduleName && newLesson && (
            <LessonForm lesson={newLesson} onChange={setNewLesson}
              onSave={() => saveLesson(newLesson)}
              onCancel={() => { setAddingTo(null); setNewLesson(null); }}
              saving={saving} />
          )}
        </div>
      )}
    </div>
  );
}

export default function InstructorLessonsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [emptyModules, setEmptyModules] = useState<string[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LessonData | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState<LessonData | null>(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  const moduleSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchList('/api/instructor/courses').then(setCourses);
  }, []);

  const fetchLessons = useCallback(async () => {
    if (!selectedCourse) return;
    const res = await fetch(`/api/instructor/lessons?courseId=${selectedCourse}`);
    const data = await res.json();
    setLessons(parseLessonsResponse(data));
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedCourse) {
      fetchLessons();
      setExpandedModules(new Set());
      setEditingLesson(null);
      setAddingTo(null);
      setEmptyModules([]);
    } else {
      setLessons([]);
      setEmptyModules([]);
    }
  }, [selectedCourse, fetchLessons]);

  const { lessonModules, lessonModuleNames } = useMemo(() => {
    const sorted = [...lessons].sort((a, b) => a.orderIndex - b.orderIndex);
    const groups: Record<string, LessonData[]> = {};
    const orderedNames: string[] = [];
    sorted.forEach(l => {
      if (!groups[l.moduleTitle]) { groups[l.moduleTitle] = []; orderedNames.push(l.moduleTitle); }
      groups[l.moduleTitle].push(l);
    });
    return { lessonModules: groups, lessonModuleNames: orderedNames };
  }, [lessons]);

  const allModuleNames = useMemo(() => {
    const names = [...lessonModuleNames];
    emptyModules.forEach(em => { if (!names.includes(em)) names.push(em); });
    return names;
  }, [lessonModuleNames, emptyModules]);

  const moduleIds = useMemo(() => allModuleNames.map(n => `module-${n}`), [allModuleNames]);

  const toggleModule = (name: string) => {
    setExpandedModules(prev => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next; });
  };

  const persistOrder = async (updatedLessons: LessonData[]) => {
    const updates = updatedLessons.filter(l => l.id).map(l => ({ id: l.id!, orderIndex: l.orderIndex }));
    if (updates.length === 0) return;
    setReordering(true);
    try {
      const res = await fetch('/api/instructor/lessons/reorder', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourse, updates }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (err) {
      console.error('Reorder failed, refetching...', err);
      await fetchLessons();
    }
    setReordering(false);
  };

  const handleModuleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeModuleName = (active.id as string).replace('module-', '');
    const overModuleName = (over.id as string).replace('module-', '');
    const oldIndex = allModuleNames.indexOf(activeModuleName);
    const newIndex = allModuleNames.indexOf(overModuleName);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(allModuleNames, oldIndex, newIndex);
    setEmptyModules(newOrder.filter(n => !lessonModuleNames.includes(n)));
    const lessonOnlyOrder = newOrder.filter(n => lessonModuleNames.includes(n));
    const newLessons: LessonData[] = [];
    let idx = 0;
    for (const modName of lessonOnlyOrder) {
      for (const lesson of lessonModules[modName]) { newLessons.push({ ...lesson, orderIndex: idx }); idx++; }
    }
    setLessons(newLessons);
    await persistOrder(newLessons);
  };

  const handleLessonDragEnd = async (moduleName: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const moduleLessonsArr = lessonModules[moduleName];
    if (!moduleLessonsArr) return;
    const oldIndex = moduleLessonsArr.findIndex(l => (l.id || `temp-${l.orderIndex}`) === active.id);
    const newIndex = moduleLessonsArr.findIndex(l => (l.id || `temp-${l.orderIndex}`) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const existingSlots = moduleLessonsArr.map(l => l.orderIndex);
    const reorderedModuleLessons = arrayMove(moduleLessonsArr, oldIndex, newIndex);
    const updatedModuleLessons = reorderedModuleLessons.map((l, i) => ({ ...l, orderIndex: existingSlots[i] }));
    const changedIds = new Set(updatedModuleLessons.map(l => l.id));
    setLessons(lessons.map(l => changedIds.has(l.id) ? updatedModuleLessons.find(u => u.id === l.id)! : l));
    await persistOrder(updatedModuleLessons);
  };

  const saveLesson = async (lesson: LessonData) => {
    setSaving(true);
    const body = { ...lesson, orderIndex: Number(lesson.orderIndex), questions: lesson.lessonType === 'QUIZ' ? lesson.questions : null, videoUrl: lesson.lessonType === 'CONTENT' ? lesson.videoUrl : null };
    const res = lesson.id
      ? await fetch(`/api/instructor/lessons/${lesson.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/instructor/lessons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      // Keep the form open so nothing typed is lost, and say why.
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Could not save the lesson. Check the fields and try again.');
      setSaving(false);
      return;
    }
    await fetchLessons();
    setEmptyModules(prev => prev.filter(m => m !== lesson.moduleTitle));
    setEditingLesson(null); setEditForm(null); setAddingTo(null); setNewLesson(null); setSaving(false);
  };

  const deleteLesson = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    await fetch(`/api/instructor/lessons/${id}`, { method: 'DELETE' });
    setLessons(prev => prev.filter(l => l.id !== id));
  };

  const deleteModule = async (moduleName: string) => {
    const moduleLessonsArr = lessonModules[moduleName] || [];
    if (moduleLessonsArr.length === 0) { setEmptyModules(prev => prev.filter(m => m !== moduleName)); return; }
    if (!confirm(`Delete module "${moduleName}" and all its ${moduleLessonsArr.length} lessons?`)) return;
    for (const l of moduleLessonsArr) { if (l.id) await fetch(`/api/instructor/lessons/${l.id}`, { method: 'DELETE' }); }
    setLessons(prev => prev.filter(l => l.moduleTitle !== moduleName));
  };

  const renameModule = async (oldName: string, newName: string) => {
    if (allModuleNames.includes(newName) && newName !== oldName) { alert('A module with that name already exists.'); return; }
    setExpandedModules(prev => { const next = new Set(prev); if (next.has(oldName)) { next.delete(oldName); next.add(newName); } return next; });
    if (addingTo === oldName) setAddingTo(newName);
    const moduleLessonsArr = lessonModules[oldName] || [];
    if (moduleLessonsArr.length === 0) { setEmptyModules(prev => prev.map(m => m === oldName ? newName : m)); return; }
    setLessons(prev => prev.map(l => l.moduleTitle === oldName ? { ...l, moduleTitle: newName } : l));
    try {
      const res = await fetch('/api/instructor/lessons/rename-module', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: selectedCourse, oldName, newName }) });
      if (!res.ok) throw new Error('Rename failed');
    } catch (err) { console.error('Rename failed, refetching...', err); await fetchLessons(); }
  };

  const startAddLesson = (moduleName: string) => {
    const moduleLessonsArr = lessonModules[moduleName] || [];
    const allLessonsMax = lessons.length > 0 ? Math.max(...lessons.map(l => l.orderIndex)) : -1;
    const moduleMax = moduleLessonsArr.length > 0 ? Math.max(...moduleLessonsArr.map(l => l.orderIndex)) : allLessonsMax;
    setAddingTo(moduleName);
    setNewLesson(emptyLesson(selectedCourse, moduleName, moduleMax + 1));
    if (!expandedModules.has(moduleName)) setExpandedModules(prev => new Set(prev).add(moduleName));
  };

  const addNewModule = () => {
    let num = 1;
    while (allModuleNames.includes(`Module ${num}`)) num++;
    const name = `Module ${num}`;
    setEmptyModules(prev => [...prev, name]);
    setExpandedModules(prev => new Set(prev).add(name));
  };

  const startEdit = (lesson: LessonData) => { setEditingLesson(lesson.id || null); setEditForm({ ...lesson }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-navy tracking-tight">Course Builder</h1>
        {reordering && <span className="text-xs text-teal-400 font-bold uppercase tracking-widest animate-pulse">Saving order…</span>}
      </div>

      <div className="mb-6">
        <label className="block text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">Select Course</label>
        <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="input-field max-w-md [&>option]:bg-canvas-alt">
          <option value="">Choose a course…</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {selectedCourse && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={addNewModule} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={18} /> Add Module
            </button>
          </div>

          <DndContext sensors={moduleSensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
            <SortableContext items={moduleIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {allModuleNames.map((moduleName, moduleIndex) => (
                  <SortableModule key={moduleName} moduleName={moduleName} moduleIndex={moduleIndex}
                    moduleLessons={lessonModules[moduleName] || []} isExpanded={expandedModules.has(moduleName)}
                    toggleModule={toggleModule} startAddLesson={startAddLesson}
                    deleteModule={deleteModule} renameModule={renameModule}
                    editingLesson={editingLesson} editForm={editForm} setEditForm={setEditForm}
                    saveLesson={saveLesson} setEditingLesson={setEditingLesson}
                    startEdit={startEdit} deleteLesson={deleteLesson}
                    addingTo={addingTo} newLesson={newLesson} setNewLesson={setNewLesson}
                    setAddingTo={setAddingTo} saving={saving} onLessonDragEnd={handleLessonDragEnd} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {allModuleNames.length === 0 && !addingTo && (
            <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-12 text-center">
              <BookOpen className="text-slate-700 mx-auto mb-4" size={48} />
              <h3 className="text-base font-bold text-ink-muted mb-2">No modules yet</h3>
              <p className="text-ink-muted text-sm">Click &ldquo;Add Module&rdquo; to start building your course</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LessonForm({ lesson, onChange, onSave, onCancel, saving }: {
  lesson: LessonData; onChange: (l: LessonData) => void;
  onSave: () => void; onCancel: () => void; saving: boolean;
}) {
  const updateQuestion = (index: number, field: string, value: any) => {
    const questions = [...lesson.questions];
    questions[index] = { ...questions[index], [field]: value };
    onChange({ ...lesson, questions });
  };
  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const questions = [...lesson.questions];
    const options = [...questions[qIndex].options];
    options[oIndex] = value;
    questions[qIndex] = { ...questions[qIndex], options };
    onChange({ ...lesson, questions });
  };
  const addQuestion = () => onChange({ ...lesson, questions: [...lesson.questions, emptyQuestion()] });
  const removeQuestion = (index: number) => onChange({ ...lesson, questions: lesson.questions.filter((_, i) => i !== index) });

  return (
    <div className="px-5 py-5 bg-canvas-alt border-l-4 border-l-teal-500">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={lesson.lessonTitle} onChange={e => onChange({ ...lesson, lessonTitle: e.target.value })} placeholder="Lesson Title" className="input-field md:col-span-2" required />
          <select value={lesson.lessonType} onChange={e => onChange({ ...lesson, lessonType: e.target.value as 'CONTENT' | 'QUIZ' })} className="input-field [&>option]:bg-canvas-alt">
            <option value="CONTENT">Content Lesson</option>
            <option value="QUIZ">Quiz / Exercise</option>
          </select>
        </div>

        {lesson.lessonType === 'CONTENT' && (
          <div className="space-y-3">
            <input value={lesson.videoUrl}
              onChange={e => { let val = e.target.value; if (val.includes('<iframe')) { const m = val.match(/src="([^"]+)"/); if (m) val = m[1]; } onChange({ ...lesson, videoUrl: val }); }}
              placeholder="YouTube or Vimeo URL (optional)" className="input-field" />
            <p className="text-[10px] text-ink-muted mt-1">Paste a Vimeo/YouTube link, player URL, or full embed code.</p>
            <textarea value={lesson.content} onChange={e => onChange({ ...lesson, content: e.target.value })} placeholder="Lesson Notes (shown to students)" className="input-field" rows={4} />
            <input value={lesson.resources} onChange={e => onChange({ ...lesson, resources: e.target.value })} placeholder="Attachment URLs (one per line, optional)" className="input-field" />
          </div>
        )}

        {lesson.lessonType === 'QUIZ' && (
          <div className="space-y-4">
            <textarea value={lesson.content} onChange={e => onChange({ ...lesson, content: e.target.value })} placeholder="Quiz instructions or description (optional)" className="input-field" rows={2} />
            {lesson.questions.map((q, qi) => (
              <div key={qi} className="rounded-xl border border-hairline bg-canvas-alt p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-navy">Question {qi + 1}</span>
                  <button onClick={() => removeQuestion(qi)} className="p-1 text-ink-muted hover:text-red-400 transition-colors"><X size={14} /></button>
                </div>
                <input value={q.question} onChange={e => updateQuestion(qi, 'question', e.target.value)} placeholder="Enter question…" className="input-field mb-3" />
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${qi}`} checked={q.correctIndex === oi} onChange={() => updateQuestion(qi, 'correctIndex', oi)} className="accent-teal-400" />
                      <input value={opt} onChange={e => updateOption(qi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} className="input-field flex-1" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-ink-muted mt-2">Select the radio button next to the correct answer</p>
              </div>
            ))}
            <button onClick={addQuestion} className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition-colors"><Plus size={14} /> Add Question</button>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button onClick={onSave} disabled={saving || !lesson.lessonTitle.trim()} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50">
            <Save size={14} /> {saving ? 'Saving…' : lesson.id ? 'Save Changes' : 'Add Lesson'}
          </button>
          <button onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
