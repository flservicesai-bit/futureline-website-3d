'use client';
import { useState, useEffect } from 'react';
import { Search, Download, Eye, Clock } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { downloadCsv, toCsv } from '@/lib/csv';

const STAGES = [
  { value: 'all', label: 'All Stages' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'OFFER_SENT', label: 'Offer Sent' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'NEGOTIATING', label: 'Negotiating' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

const STAGE_DARK: Record<string, string> = {
  NEW: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  CONTACTED: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  OFFER_SENT: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  FOLLOW_UP: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  NEGOTIATING: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  WON: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  LOST: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const PRIORITY_DARK: Record<string, string> = {
  LOW: 'bg-canvas-card text-ink-muted border border-hairline',
  MEDIUM: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  HIGH: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  URGENT: 'bg-red-500/10 text-red-400 border border-red-500/20',
};


function getStageColor(stage: string) {
  return STAGE_DARK[stage] || 'bg-canvas-card text-ink-muted border border-hairline';
}

function getStageLabel(stage: string) {
  return STAGES.find(s => s.value === stage)?.label || stage;
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [view, setView] = useState<'table' | 'pipeline'>('pipeline');
  const [loading, setLoading] = useState(true);

  const fetchLeads = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (stageFilter !== 'all') params.set('stage', stageFilter);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    if (search) params.set('search', search);
    fetch(`/api/admin/leads?${params}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setLeads(data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchLeads(); }, [stageFilter, sourceFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const SOURCES = ['all', 'FL Tourism', 'FL Courses', 'FL Services', 'FL AI Automation'];

  const filtered = leads.filter(l => {
    if (!search) return true;
    const fullName = `${l.firstName || ''} ${l.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.tourType?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const stageCounts = STAGES.filter(s => s.value !== 'all').reduce((acc, s) => {
    acc[s.value] = leads.filter(l => l.stage === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  const exportCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Interest', 'Source', 'Stage', 'Priority', 'Message', 'Date'];
    const rows = filtered.map(l => [
      l.firstName || '', l.lastName || '', l.email, l.phone || '', l.company || '', l.tourType,
      l.source || 'FL Tourism', l.stage, l.priority,
      l.message || '',
      new Date(l.createdAt).toLocaleDateString('en-GB'),
    ]);
    downloadCsv('leads.csv', toCsv(headers, rows));
  };

  const updateLeadStage = async (leadId: string, newStage: string) => {
    await fetch(`/api/admin/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    });
    fetchLeads();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-navy tracking-tight">CRM Pipeline</h1>
          <p className="text-ink-muted text-sm mt-1">{leads.length} total leads</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-hairline rounded-lg overflow-hidden">
            <button
              onClick={() => setView('pipeline')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'pipeline' ? 'bg-canvas-card text-navy' : 'text-ink-muted hover:text-ink-muted'}`}
            >
              Pipeline
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'table' ? 'bg-canvas-card text-navy' : 'text-ink-muted hover:text-ink-muted'}`}
            >
              Table
            </button>
          </div>
          <Link href="/admin/templates" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-hairline text-ink-muted text-sm font-medium hover:bg-canvas-card transition-colors">Templates</Link>
          <Link href="/admin/automation" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-hairline text-ink-muted text-sm font-medium hover:bg-canvas-card transition-colors">Automation</Link>
          <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-hairline text-ink-muted text-sm font-medium hover:bg-canvas-card transition-colors">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 mb-6">
        {STAGES.filter(s => s.value !== 'all').map(s => (
          <button
            key={s.value}
            onClick={() => setStageFilter(stageFilter === s.value ? 'all' : s.value)}
            className={`rounded-xl p-3 text-center transition border ${
              stageFilter === s.value
                ? 'border-teal-500/40 bg-teal-500/10'
                : 'border-hairline bg-canvas-card hover:bg-canvas-card'
            }`}
          >
            <div className="text-2xl font-black text-navy">{stageCounts[s.value] || 0}</div>
            <div className="text-xs font-medium mt-1 text-ink-muted">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50 w-full pl-9"
          />
        </form>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted focus:outline-none focus:border-teal-500/50 min-w-[180px]"
        >
          {SOURCES.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Sources' : s}</option>
          ))}
        </select>
      </div>

      {view === 'pipeline' ? (
        <div className="grid grid-cols-7 gap-3">
          {STAGES.filter(s => s.value !== 'all').map(stage => {
            const stageLeads = filtered.filter(l => l.stage === stage.value);
            return (
              <div key={stage.value} className="rounded-xl border border-hairline bg-canvas-card p-3 min-h-[300px]">
                <div className={`text-xs font-bold uppercase px-2 py-1 rounded-lg mb-3 text-center ${STAGE_DARK[stage.value] || 'bg-canvas-card text-ink-muted border border-hairline'}`}>
                  {stage.label} ({stageLeads.length})
                </div>
                <div className="space-y-2">
                  {stageLeads.map(lead => (
                    <Link
                      key={lead.id}
                      href={`/admin/leads/${lead.id}`}
                      className="block rounded-lg p-3 border border-hairline bg-canvas-card hover:bg-canvas-card transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-sm text-ink truncate">{lead.firstName} {lead.lastName}</div>
                      {lead.company && (
                        <div className="text-xs text-ink-muted truncate mt-0.5">{lead.company}</div>
                      )}
                      <div className="text-xs text-ink-muted truncate mt-1">{lead.email}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_DARK[lead.priority] || ''}`}>
                          {lead.priority}
                        </span>
                        <span className="text-[10px] text-ink-muted">{lead.tourType}</span>
                      </div>
                      {lead.nextFollowUpAt && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-orange-400">
                          <Clock size={10} />
                          Follow up: {new Date(lead.nextFollowUpAt).toLocaleDateString('en-GB')}
                        </div>
                      )}
                    </Link>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="text-xs text-ink-muted text-center py-4">No leads</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-hairline bg-canvas-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-hairline bg-canvas-card">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Company</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Email</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Interest</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Source</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Stage</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Priority</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-ink-muted">No leads found</td></tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.id} className="border-b border-hairline hover:bg-canvas-card transition-colors">
                    <td className="px-4 py-3"><span className="font-medium text-ink">{l.firstName} {l.lastName}</span></td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{l.company || <span className="text-ink-muted">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{l.email}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{l.tourType}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20">{l.source}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={l.stage}
                        onChange={e => updateLeadStage(l.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer ${getStageColor(l.stage)}`}
                      >
                        {STAGES.filter(s => s.value !== 'all').map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${PRIORITY_DARK[l.priority] || 'bg-canvas-card text-ink-muted border-hairline'}`}>{l.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{new Date(l.createdAt).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads/${l.id}`} className="text-ink-muted hover:text-teal-400 transition-colors">
                        <Eye size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
