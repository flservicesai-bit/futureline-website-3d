'use client';
import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, DollarSign, TrendingUp, Wallet, CreditCard, Check, X, Plus } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { fetchList } from '@/lib/fetch-list';

interface PayoutHistory {
  id: string;
  amount: number;
  instructorCut: number;
  platformCut: number;
  period: string;
  createdAt: string;
  course: { title: string };
}

interface InstructorPayout {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  commissionRate: number;
  totalRevenue: number;
  instructorOwed: number;
  platformCut: number;
  totalPaid: number;
  balance: number;
  courses: { id: string; title: string; revenue: number; orderCount: number }[];
  payoutHistory: PayoutHistory[];
}

export default function AdminPayoutsPage() {
  const [instructors, setInstructors] = useState<InstructorPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logPayoutFor, setLogPayoutFor] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutPeriod, setPayoutPeriod] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [rateValue, setRateValue] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    setInstructors(await fetchList('/api/admin/payouts'));
    setLoading(false);
  }, []);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const totalRevenue = instructors.reduce((s, i) => s + i.totalRevenue, 0);
  const totalOwed = instructors.reduce((s, i) => s + i.balance, 0);
  const totalPlatform = instructors.reduce((s, i) => s + i.platformCut, 0);

  const logPayout = async (instructorId: string) => {
    if (!payoutAmount || !payoutPeriod) return;
    setSavingPayout(true);
    await fetch(`/api/admin/payouts/${instructorId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(payoutAmount), period: payoutPeriod }),
    });
    setLogPayoutFor(null);
    setPayoutAmount('');
    setPayoutPeriod('');
    setSavingPayout(false);
    fetchPayouts();
  };

  const saveRate = async (instructorId: string) => {
    setSavingRate(true);
    const res = await fetch(`/api/admin/payouts/${instructorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commissionRate: parseFloat(rateValue) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Could not save the commission rate.');
      setSavingRate(false);
      return;
    }
    setEditingRate(null);
    setSavingRate(false);
    fetchPayouts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-navy tracking-tight mb-2">Instructor Payouts</h1>
      <p className="text-ink-muted text-sm mb-8">Track revenue per instructor and log payments you have made.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <TrendingUp className="text-teal-400" size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Total Revenue Collected</p>
            <p className="text-3xl font-black text-navy">{formatPrice(totalRevenue)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <Wallet className="text-orange-400" size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Outstanding to Instructors</p>
            <p className="text-3xl font-black text-navy">{formatPrice(totalOwed)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <CreditCard className="text-purple-400" size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Your Platform Earnings</p>
            <p className="text-3xl font-black text-navy">{formatPrice(totalPlatform)}</p>
          </div>
        </div>
      </div>

      {instructors.length === 0 ? (
        <div className="rounded-xl border border-hairline bg-canvas-card p-12 text-center">
          <DollarSign className="text-ink-muted mx-auto mb-4" size={48} />
          <h3 className="text-lg font-semibold text-ink-muted mb-2">No instructors yet</h3>
          <p className="text-ink-muted text-sm">Payouts will appear here once instructors have completed orders.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {instructors.map(inst => (
            <div key={inst.id} className="rounded-xl border border-hairline bg-canvas-card overflow-hidden">
              <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {inst.firstName[0]}{inst.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-navy">{inst.firstName} {inst.lastName}</h2>
                      <span className="text-xs text-ink-muted">{inst.email}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-ink-muted">Commission:</span>
                      {editingRate === inst.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={rateValue}
                            onChange={e => setRateValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveRate(inst.id); if (e.key === 'Escape') setEditingRate(null); }}
                            className="bg-canvas-card border border-hairline rounded-lg px-2 py-0.5 text-xs text-ink-muted focus:outline-none focus:border-teal-500/50 w-16"
                            autoFocus
                          />
                          <span className="text-xs text-ink-muted">%</span>
                          <button onClick={() => saveRate(inst.id)} disabled={savingRate} className="p-1 text-teal-400 hover:bg-teal-500/10 rounded">
                            <Check size={12} />
                          </button>
                          <button onClick={() => setEditingRate(null)} className="p-1 text-ink-muted hover:text-ink-muted rounded">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingRate(inst.id); setRateValue(String(inst.commissionRate)); }}
                          className="text-xs font-semibold text-teal-400 hover:underline"
                        >
                          {inst.commissionRate}%
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="px-3">
                    <p className="text-xs text-ink-muted">Revenue</p>
                    <p className="text-sm font-bold text-navy">{formatPrice(inst.totalRevenue)}</p>
                  </div>
                  <div className="px-3">
                    <p className="text-xs text-ink-muted">Their Share</p>
                    <p className="text-sm font-bold text-navy">{formatPrice(inst.instructorOwed)}</p>
                  </div>
                  <div className="px-3">
                    <p className="text-xs text-ink-muted">Paid Out</p>
                    <p className="text-sm font-bold text-teal-400">{formatPrice(inst.totalPaid)}</p>
                  </div>
                  <div className="px-3">
                    <p className="text-xs text-ink-muted">Balance Due</p>
                    <p className={`text-sm font-bold ${inst.balance > 0 ? 'text-orange-400' : 'text-ink-muted'}`}>
                      {formatPrice(Math.max(inst.balance, 0))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      setLogPayoutFor(logPayoutFor === inst.id ? null : inst.id);
                      setPayoutAmount('');
                      setPayoutPeriod('');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    <Plus size={14} /> Log Payment
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === inst.id ? null : inst.id)}
                    className="p-2 text-ink-muted hover:text-ink rounded-lg transition-colors"
                    title="View details"
                  >
                    {expandedId === inst.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                </div>
              </div>

              {logPayoutFor === inst.id && (
                <div className="border-t border-hairline px-5 py-4 bg-teal-500/[0.04]">
                  <p className="text-sm font-semibold text-navy mb-3">Log a payment to {inst.firstName}</p>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Amount Paid (OMR)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payoutAmount}
                        onChange={e => setPayoutAmount(e.target.value)}
                        placeholder={`e.g. ${formatPrice(Math.max(inst.balance, 0))}`}
                        className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50 w-44"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Period / Label</label>
                      <input
                        type="text"
                        value={payoutPeriod}
                        onChange={e => setPayoutPeriod(e.target.value)}
                        placeholder="e.g. March 2026"
                        className="bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50 w-44"
                      />
                    </div>
                    <button
                      onClick={() => logPayout(inst.id)}
                      disabled={savingPayout || !payoutAmount || !payoutPeriod}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {savingPayout ? 'Saving...' : 'Confirm Payment'}
                    </button>
                    <button
                      onClick={() => setLogPayoutFor(null)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-hairline text-ink-muted text-sm font-medium hover:bg-canvas-card transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {expandedId === inst.id && (
                <div className="border-t border-hairline">
                  {inst.courses.length > 0 && (
                    <div className="px-5 py-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-3">Courses</p>
                      <div className="space-y-2">
                        {inst.courses.map(c => (
                          <div key={c.id} className="flex items-center justify-between text-sm">
                            <span className="text-ink-muted">{c.title}</span>
                            <div className="flex items-center gap-4 text-ink-muted">
                              <span>{c.orderCount} enrolment{c.orderCount !== 1 ? 's' : ''}</span>
                              <span className="font-semibold text-navy">{formatPrice(c.revenue)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-hairline px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-3">Payment History</p>
                    {inst.payoutHistory.length === 0 ? (
                      <p className="text-sm text-ink-muted">No payments logged yet.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                            <th className="text-left pb-2">Period</th>
                            <th className="text-left pb-2">Course</th>
                            <th className="text-right pb-2">Paid to Instructor</th>
                            <th className="text-right pb-2">Platform Cut</th>
                            <th className="text-right pb-2">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inst.payoutHistory.map(p => (
                            <tr key={p.id} className="border-t border-hairline">
                              <td className="py-2 font-medium text-navy">{p.period}</td>
                              <td className="py-2 text-ink-muted text-xs">{p.course?.title}</td>
                              <td className="py-2 text-right text-teal-400 font-semibold">{formatPrice(p.instructorCut)}</td>
                              <td className="py-2 text-right text-ink-muted">{formatPrice(p.platformCut)}</td>
                              <td className="py-2 text-right text-ink-muted">{new Date(p.createdAt).toLocaleDateString('en-GB')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
