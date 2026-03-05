'use client';

import { type ReactNode } from 'react';
import SidebarNav, { type NavItem } from './sidebar-nav';

/* ── Layout Shell ──────────────────────────────────────────────────── */

interface LayoutShellProps {
  title: string;
  subtitle: string;
  badge: string;
  navItems: NavItem[];
  children: ReactNode;
}

export default function LayoutShell({ title, subtitle, badge, navItems, children }: LayoutShellProps) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="bg-card/80 sticky top-0 z-20 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
          <h1 className="text-lg font-bold">{title}</h1>
          <span className="bg-primary/15 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">{badge}</span>
          <span className="text-muted-foreground hidden text-sm md:block">{subtitle}</span>
        </div>
      </header>

      {/* ── Main Layout ────────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-7xl gap-0">
        {/* Sidebar */}
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-[240px] shrink-0 overflow-y-auto border-r p-4 lg:block">
          <SidebarNav items={navItems} />
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
