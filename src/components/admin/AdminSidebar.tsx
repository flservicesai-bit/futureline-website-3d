'use client';
import { Link } from '@/i18n/routing';

import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, BookOpen, FileText, Briefcase, Users,
  ShoppingCart, GraduationCap, Brain, Palette, Star,
  MessageSquare, LogOut, Home, UserCheck, Zap, Mail, Settings, Banknote
} from 'lucide-react';

const links = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/lessons', label: 'Course Builder', icon: FileText },
  { href: '/admin/instructors', label: 'Instructors', icon: UserCheck },
  { href: '/admin/services', label: 'Services', icon: Briefcase },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/payouts', label: 'Payouts', icon: Banknote },
  { href: '/admin/enrollments', label: 'Enrollments', icon: GraduationCap },
  { href: '/admin/leads', label: 'CRM Pipeline', icon: MessageSquare },
  { href: '/admin/templates', label: 'Templates', icon: Mail },
  { href: '/admin/automation', label: 'Automation', icon: Zap },
  { href: '/admin/testimonials', label: 'Testimonials', icon: Star },
  { href: '/admin/ai-settings', label: 'AI Settings', icon: Brain },
  { href: '/admin/brand', label: 'Brand Settings', icon: Palette },
  { href: '/admin/settings', label: 'Security Settings', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-canvas-card backdrop-blur-2xl border-r border-hairline flex flex-col min-h-screen sticky top-0">
      <div className="p-6 border-b border-hairline">
        <Link href="/admin" className="flex items-center gap-2">
          <div>
            <span
              className="text-lg font-bold block text-transparent bg-clip-text"
              style={{
                background: 'linear-gradient(to right, #22a6f7, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              FutureLine
            </span>
            <span className="text-[10px] text-ink-muted uppercase tracking-widest">Admin Portal</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-2 ${
                isActive
                  ? 'bg-teal-500/10 text-teal-400 border-teal-400'
                  : 'text-ink-muted hover:bg-canvas-card hover:text-ink-muted border-transparent'
              }`}
            >
              <link.icon size={18} />
              <span className="text-sm">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-hairline space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-2 text-ink-muted hover:bg-canvas-card hover:text-ink-muted border-transparent"
        >
          <Home size={18} />
          <span className="text-sm">View Site</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-2 text-ink-muted hover:bg-canvas-card hover:text-ink-muted border-transparent w-full"
        >
          <LogOut size={18} />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
