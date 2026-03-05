'use client';

import { type ReactNode } from 'react';

/* ── Section Color Map ─────────────────────────────────────────────── */

export const SECTION_COLORS = {
  blue: { border: 'border-l-blue-500', dot: 'bg-blue-500', badge: 'bg-blue-500/15 text-blue-400' },
  cyan: { border: 'border-l-cyan-500', dot: 'bg-cyan-500', badge: 'bg-cyan-500/15 text-cyan-400' },
  green: {
    border: 'border-l-green-500',
    dot: 'bg-green-500',
    badge: 'bg-green-500/15 text-green-400'
  },
  purple: {
    border: 'border-l-purple-500',
    dot: 'bg-purple-500',
    badge: 'bg-purple-500/15 text-purple-400'
  },
  indigo: {
    border: 'border-l-indigo-500',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-500/15 text-indigo-400'
  },
  amber: {
    border: 'border-l-amber-500',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/15 text-amber-400'
  },
  rose: { border: 'border-l-rose-500', dot: 'bg-rose-500', badge: 'bg-rose-500/15 text-rose-400' },
  emerald: {
    border: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-400'
  },
  orange: {
    border: 'border-l-orange-500',
    dot: 'bg-orange-500',
    badge: 'bg-orange-500/15 text-orange-400'
  },
  teal: { border: 'border-l-teal-500', dot: 'bg-teal-500', badge: 'bg-teal-500/15 text-teal-400' },
  violet: {
    border: 'border-l-violet-500',
    dot: 'bg-violet-500',
    badge: 'bg-violet-500/15 text-violet-400'
  },
  sky: { border: 'border-l-sky-500', dot: 'bg-sky-500', badge: 'bg-sky-500/15 text-sky-400' },
  fuchsia: {
    border: 'border-l-fuchsia-500',
    dot: 'bg-fuchsia-500',
    badge: 'bg-fuchsia-500/15 text-fuchsia-400'
  }
} as const;

export type SectionColor = keyof typeof SECTION_COLORS;

/* ── Section Component ─────────────────────────────────────────────── */

interface SectionProps {
  id: string;
  number: number;
  title: string;
  color: SectionColor;
  subtitle?: string;
  children: ReactNode;
}

export function Section({ id, number, title, color, subtitle, children }: SectionProps) {
  const c = SECTION_COLORS[color];
  return (
    <section id={id} className="mb-8 scroll-mt-8">
      <div className={`bg-card rounded-lg border border-l-4 ${c.border} p-6 shadow-sm`}>
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-3">
            <span className={`${c.badge} rounded-full px-2.5 py-0.5 text-xs font-bold`}>{String(number).padStart(2, '0')}</span>
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </section>
  );
}

/* ── Sub-section ───────────────────────────────────────────────────── */

interface SubSectionProps {
  title: string;
  children: ReactNode;
}

export function SubSection({ title, children }: SubSectionProps) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
