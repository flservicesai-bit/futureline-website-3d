'use client';

import { Link } from '@/i18n/routing';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 90, damping: 18, delay },
});

export default function HeroButtons() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">

      {/* Primary — Explore Courses */}
      <motion.div {...fadeUp(2.0)}>
        <motion.div
          whileHover={{ scale: 1.06, y: -3 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        >
          <Link
            href="/courses"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-gradient-to-r from-navy-light to-primary-container text-navy font-semibold hover:shadow-lg hover:shadow-primary-container/20 transition-shadow duration-300"
          >
            Explore Courses
            <motion.span
              className="inline-flex"
              initial={{ x: 0 }}
              whileHover={{ x: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <ArrowRight size={17} className="rtl:rotate-180" />
            </motion.span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Secondary — View Solutions */}
      <motion.div {...fadeUp(2.18)}>
        <motion.div
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        >
          <Link
            href="/services"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg border border-primary/40 text-primary font-semibold hover:bg-primary/10 hover:border-primary/70 transition-colors duration-300"
          >
            View Solutions
          </Link>
        </motion.div>
      </motion.div>

    </div>
  );
}
