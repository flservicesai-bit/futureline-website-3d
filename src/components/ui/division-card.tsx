'use client';

import { useRef } from 'react';
import { Link } from '@/i18n/routing';
import { FlaskConical, GraduationCap, ChevronRight } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/* ── Variants ── */
const containerVariants = {
  hidden: (direction: 'left' | 'right') => ({
    opacity: 0,
    x: direction === 'left' ? -90 : 90,
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'tween' as const,
      duration: 1.6,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      staggerChildren: 0.11,
      delayChildren: 0.5,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

/* ── Config ── */
const CONFIGS = {
  lab: {
    href: '/services',
    Icon: FlaskConical,
    badgeLabel: 'Solutions',
    title: 'FL Lab',
    description:
      'The innovation engine of FutureLine. FL Lab provides cutting-edge AI solutions, digital transformation services, and custom software engineering to enterprises seeking technological advancement.',
    tags: ['AI Integration', 'Digital Transformation', 'Custom Software', 'Consulting'],
    cta: 'Explore Solutions',
    accent: '#18a999',
    border: 'border-[#18a999]/25 hover:border-[#18a999]/50 hover:shadow-[#18a999]/20',
    bg: 'from-[#18a999]/10 via-surface-container to-surface-container',
    badgeBg: 'bg-[#18a999]/15 border-[#18a999]/30',
    badgeText: 'text-primary',
    iconBg: 'bg-[#18a999]/15 border-[#18a999]/30 group-hover:shadow-[#18a999]/30',
    tagBg: 'bg-[#18a999]/10 border-[#18a999]/20 text-primary',
    ctaText: 'text-primary',
    glow1Class: '-top-16 -right-16 w-80 h-80 bg-[#18a999]/10 group-hover:bg-[#18a999]/20',
    glow2Class: '-bottom-20 -left-10 w-56 h-56 bg-[#18a999]/[0.06]',
    accentBar: 'via-[#18a999]',
  },
  academy: {
    href: '/courses',
    Icon: GraduationCap,
    badgeLabel: 'Education',
    title: 'FL Academy',
    description:
      'The learning arm of FutureLine. FL Academy delivers professional-grade courses in AI, engineering, and systems thinking. Expert instructors, structured curriculum, and real-world projects.',
    tags: ['AI & Machine Learning', 'Systems Engineering', 'Professional Training', 'Certifications'],
    cta: 'Browse Courses',
    accent: '#93AEFF',
    border: 'border-[#93AEFF]/20 hover:border-[#93AEFF]/40 hover:shadow-[#93AEFF]/15',
    bg: 'from-[#93AEFF]/[0.07] via-surface-container to-surface-container',
    badgeBg: 'bg-[#93AEFF]/10 border-[#93AEFF]/25',
    badgeText: 'text-secondary',
    iconBg: 'bg-[#93AEFF]/10 border-[#93AEFF]/25 group-hover:shadow-[#93AEFF]/25',
    tagBg: 'bg-[#93AEFF]/[0.08] border-[#93AEFF]/20 text-secondary',
    ctaText: 'text-secondary',
    glow1Class: '-bottom-16 -right-16 w-80 h-80 bg-[#93AEFF]/[0.07] group-hover:bg-[#93AEFF]/[0.14]',
    glow2Class: '-top-10 -left-10 w-56 h-56 bg-[#93AEFF]/[0.04]',
    accentBar: 'via-[#93AEFF]',
  },
} as const;

interface Props {
  variant: 'lab' | 'academy';
  direction: 'left' | 'right';
}

export default function DivisionCard({ variant, direction }: Props) {
  const cfg = CONFIGS[variant];
  const { Icon } = cfg;

  /* 3D tilt */
  const ref    = useRef<HTMLDivElement>(null);
  const rawX   = useMotionValue(0);
  const rawY   = useMotionValue(0);
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [10, -10]), { stiffness: 300, damping: 25 });
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-10, 10]), { stiffness: 300, damping: 25 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function onMouseLeave() { rawX.set(0); rawY.set(0); }

  return (
    <div ref={ref} style={{ perspective: 900 }} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} className="h-full">
      <motion.div
        custom={direction}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="will-change-transform h-full"
      >
        <Link
          href={cfg.href}
          className={`group relative rounded-2xl overflow-hidden border bg-gradient-to-br ${cfg.bg} ${cfg.border} hover:shadow-2xl transition-all duration-500 p-8 block h-full`}
        >
          {/* Top accent bar */}
          <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${cfg.accentBar} to-transparent`} />
          {/* Glow orbs */}
          <div className={`absolute rounded-full blur-3xl transition-colors duration-500 ${cfg.glow1Class}`} />
          <div className={`absolute rounded-full blur-3xl ${cfg.glow2Class}`} />

          <div className="relative">
            {/* Badge + icon row */}
            <motion.div variants={itemVariants} className="flex items-start justify-between mb-6">
              <div>
                <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border mb-4 ${cfg.badgeBg}`}>
                  <Icon size={11} className={cfg.badgeText} />
                  <span className={`text-[11px] font-semibold tracking-widest uppercase ${cfg.badgeText}`}>{cfg.badgeLabel}</span>
                </div>
                <h3 className="text-2xl font-bold text-navy">{cfg.title}</h3>
              </div>
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg transition-all duration-300 flex-shrink-0 ${cfg.iconBg}`}>
                <Icon size={26} className={cfg.badgeText} />
              </div>
            </motion.div>

            {/* Description */}
            <motion.p variants={itemVariants} className="text-on-surface-variant leading-relaxed mb-6">
              {cfg.description}
            </motion.p>

            {/* Tags */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-8">
              {cfg.tags.map((tag) => (
                <span key={tag} className={`px-3 py-1 rounded-full text-xs font-medium border ${cfg.tagBg}`}>
                  {tag}
                </span>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div variants={itemVariants} className={`flex items-center gap-2 font-semibold text-sm group-hover:gap-3 transition-all duration-300 ${cfg.ctaText}`}>
              {cfg.cta} <ChevronRight size={15} className="rtl:rotate-180" />
            </motion.div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
