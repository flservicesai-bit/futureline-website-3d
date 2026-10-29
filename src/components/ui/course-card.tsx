'use client';

import { Link } from '@/i18n/routing';
import { BookOpen, Users, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

interface CourseCardProps {
  href: string;
  gradient: string;
  levelColor: string;
  level: string;
  durationHours: number;
  isEnrolled: boolean;
  title: string;
  shortDescription: string | null;
  instructorName: string | null;
  location: string | null;
  ctaLabel: string;
}

export default function CourseCard({
  href, gradient, levelColor, level, durationHours,
  isEnrolled, title, shortDescription, instructorName, location, ctaLabel,
}: CourseCardProps) {
  return (
    <div>
      <motion.div
        whileHover={{ scale: 1.04 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="group rounded-xl overflow-hidden flex flex-col bg-canvas-card border border-hairline backdrop-blur-sm hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/[0.08] transition-colors duration-300 will-change-transform"
      >
        <Link href={href} className="flex flex-col flex-1">
          {/* Thumbnail */}
          <div className={`h-44 relative overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <BookOpen className="text-ink-muted" size={52} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
            {/* Badges */}
            <div className="absolute bottom-3 start-3 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-widest backdrop-blur-md ${levelColor}`}>
                {level}
              </span>
              <span className="px-2 py-0.5 rounded bg-canvas-card border border-hairline text-[10px] font-bold text-navy uppercase tracking-widest backdrop-blur-md">
                {durationHours}h
              </span>
            </div>
            {isEnrolled && (
              <div className="absolute top-3 end-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 backdrop-blur-md">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Enrolled</span>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-col flex-1 p-5">
            <h3 className="text-sm font-bold text-navy mb-2 group-hover:text-teal-300 transition-colors line-clamp-2 leading-snug">
              {title}
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed line-clamp-2 mb-4">
              {shortDescription}
            </p>

            <div className="flex items-center gap-3 text-[11px] text-ink-muted mb-5">
              {instructorName && (
                <span className="flex items-center gap-1">
                  <Users size={11} /> {instructorName}
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {location}
                </span>
              )}
            </div>

            {/* CTA */}
            <div className="mt-auto">
              <div className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all group-hover:gap-3 ${
                isEnrolled
                  ? 'bg-teal-500/10 border border-teal-500/20 text-teal-400'
                  : 'bg-canvas-card border border-hairline text-ink-muted group-hover:bg-teal-500/10 group-hover:border-teal-500/20 group-hover:text-teal-400'
              }`}>
                <span>{ctaLabel}</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
