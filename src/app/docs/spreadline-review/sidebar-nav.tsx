'use client';

import { useEffect, useState } from 'react';
import { SECTION_COLORS, type SectionColor } from './section';

/* ── Types ─────────────────────────────────────────────────────────── */

export interface NavItem {
  id: string;
  label: string;
  number: number;
  color: SectionColor;
}

/* ── Sidebar Navigation ───────────────────────────────────────────── */

interface SidebarNavProps {
  items: NavItem[];
}

export default function SidebarNav({ items }: SidebarNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          // pick the one closest to top
          const top = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
          setActiveId(top.target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="space-y-1">
      <div className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">Contents</div>
      {items.map(item => {
        const isActive = activeId === item.id;
        const c = SECTION_COLORS[item.color];
        return (
          <button
            key={item.id}
            onClick={() => scrollTo(item.id)}
            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
              isActive ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
            <span className="truncate">
              {item.number}. {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
