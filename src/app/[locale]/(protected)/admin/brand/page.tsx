'use client';
import { useState, useEffect } from 'react';
import { Palette, Save, Mail, Landmark } from 'lucide-react';

export default function BrandSettingsPage() {
  // Colours start valid: an empty value in <input type="color"> logs a console warning until the fetch lands.
  const [settings, setSettings] = useState({ companyName: '', tagline: '', primaryColor: '#011C41', accentColor: '#1466DE', logo: '', contactEmail: '', tourismEmail: '', bankPayee: '', receiptWhatsapp: '' });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // An error response is an { error } object, not settings: keep the defaults.
    fetch('/api/admin/settings/brand').then(r => (r.ok ? r.json() : null)).then(data => {
      if (data) setSettings(data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/admin/settings/brand', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: settings.companyName,
        tagline: settings.tagline,
        primaryColor: settings.primaryColor,
        accentColor: settings.accentColor,
        logo: settings.logo,
        contactEmail: settings.contactEmail,
        tourismEmail: settings.tourismEmail,
        bankPayee: settings.bankPayee,
        receiptWhatsapp: settings.receiptWhatsapp,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Could not save brand settings. Please try again.');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-navy tracking-tight">Brand Settings</h1>
      </div>
      <form onSubmit={handleSubmit} className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-8 max-w-2xl space-y-6">
        <div className="flex items-center gap-4 p-4 bg-canvas-card border border-hairline rounded-xl mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Palette className="text-navy" size={22} />
          </div>
          <div>
            <div className="font-semibold text-navy">Brand Identity</div>
            <div className="text-sm text-ink-muted">Customize your platform appearance</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Company Name</label>
            <input value={settings.companyName} onChange={e => setSettings({...settings, companyName: e.target.value})} className="w-full bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Tagline</label>
            <input value={settings.tagline} onChange={e => setSettings({...settings, tagline: e.target.value})} className="w-full bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Primary Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})} className="w-10 h-10 rounded-lg cursor-pointer bg-canvas-card border border-hairline" />
              <input value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})} className="flex-1 bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Accent Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={settings.accentColor} onChange={e => setSettings({...settings, accentColor: e.target.value})} className="w-10 h-10 rounded-lg cursor-pointer bg-canvas-card border border-hairline" />
              <input value={settings.accentColor} onChange={e => setSettings({...settings, accentColor: e.target.value})} className="flex-1 bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Logo URL</label>
            <input value={settings.logo || ''} onChange={e => setSettings({...settings, logo: e.target.value})} className="w-full bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50" placeholder="https://..." />
          </div>
        </div>

        <div className="border-t border-hairline pt-6 mt-2">
          <div className="flex items-center gap-4 p-4 bg-canvas-card border border-hairline rounded-xl mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Mail className="text-navy" size={22} />
            </div>
            <div>
              <div className="font-semibold text-navy">Contact Emails</div>
              <div className="text-sm text-ink-muted">Public-facing email addresses shown on your website</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Contact Email (Services)</label>
              <input type="email" value={settings.contactEmail} onChange={e => setSettings({...settings, contactEmail: e.target.value})} className="w-full bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50" placeholder="contact@example.com" />
              <p className="text-xs text-ink-muted mt-1">Used on Services and Digitalisation pages</p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Contact Email (Tourism)</label>
              <input type="email" value={settings.tourismEmail} onChange={e => setSettings({...settings, tourismEmail: e.target.value})} className="w-full bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50" placeholder="tourism@example.com" />
              <p className="text-xs text-ink-muted mt-1">Used on the FL Tourism page</p>
            </div>
          </div>
        </div>

        <div className="border-t border-hairline pt-6 mt-2">
          <div className="flex items-center gap-4 p-4 bg-canvas-card border border-hairline rounded-xl mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Landmark className="text-navy" size={22} />
            </div>
            <div>
              <div className="font-semibold text-navy">Bank Transfer</div>
              <div className="text-sm text-ink-muted">Shown to customers who pay for a course by bank transfer</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Pay To</label>
              <input value={settings.bankPayee} onChange={e => setSettings({...settings, bankPayee: e.target.value})} className="w-full bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50" placeholder="Name, account or phone" />
              <p className="text-xs text-ink-muted mt-1">Exactly as customers should see it</p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Receipt WhatsApp Number</label>
              <input value={settings.receiptWhatsapp} onChange={e => setSettings({...settings, receiptWhatsapp: e.target.value})} className="w-full bg-canvas-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted focus:outline-none focus:border-teal-500/50" />
              <p className="text-xs text-ink-muted mt-1">Customers send their payment receipt here</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
            <Save size={16} /> {loading ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-sm text-teal-400 font-semibold">Settings saved!</span>}
        </div>
      </form>
    </div>
  );
}
