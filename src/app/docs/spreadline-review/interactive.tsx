'use client';

import { useState, type ReactNode } from 'react';

/* ── Collapsible Section ─────────────────────────────────────────── */

interface CollapsibleProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}

export function Collapsible({ title, children, defaultOpen = false, badge }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-3 overflow-hidden rounded-lg border">
      <button
        onClick={() => setOpen(!open)}
        className="bg-muted/30 hover:bg-muted/60 flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className={`inline-block text-xs transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>&#9654;</span>
          {title}
          {badge && <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-xs font-normal">{badge}</span>}
        </span>
        <span className="text-muted-foreground text-xs">{open ? 'Collapse' : 'Expand'}</span>
      </button>
      <div
        className={`border-t transition-all duration-200 ${open ? 'max-h-[5000px] p-4 opacity-100' : 'max-h-0 overflow-hidden p-0 opacity-0'}`}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Tabs ─────────────────────────────────────────────────────────── */

interface TabItem {
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultIndex?: number;
}

export function Tabs({ tabs, defaultIndex = 0 }: TabsProps) {
  const [active, setActive] = useState(defaultIndex);
  return (
    <div className="my-4 overflow-hidden rounded-lg border">
      <div className="bg-muted/30 flex border-b">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              active === i ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {tab.label}
            {active === i && <span className="bg-primary absolute right-0 bottom-0 left-0 h-0.5 rounded-t" />}
          </button>
        ))}
      </div>
      <div className="p-4">{tabs[active].content}</div>
    </div>
  );
}

/* ── Step-by-step ────────────────────────────────────────────────── */

interface StepProps {
  number: number;
  title: string;
  children: ReactNode;
}

export function Step({ number, title, children }: StepProps) {
  return (
    <div className="mb-6 flex gap-4">
      <div className="flex flex-col items-center">
        <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
          {number}
        </div>
        <div className="bg-border mt-2 w-px flex-1" />
      </div>
      <div className="flex-1 pb-4">
        <h4 className="mb-2 font-semibold">{title}</h4>
        <div className="text-muted-foreground text-sm">{children}</div>
      </div>
    </div>
  );
}

/* ── Callout ──────────────────────────────────────────────────────── */

interface CalloutProps {
  type: 'info' | 'warning' | 'tip' | 'important';
  title?: string;
  children: ReactNode;
}

const calloutConfig = {
  info: {
    bg: 'bg-blue-500/8',
    border: 'border-l-blue-500',
    icon: '\u2139\uFE0F',
    label: 'Info'
  },
  warning: {
    bg: 'bg-yellow-500/8',
    border: 'border-l-yellow-500',
    icon: '\u26A0\uFE0F',
    label: 'Warning'
  },
  tip: {
    bg: 'bg-green-500/8',
    border: 'border-l-green-500',
    icon: '\uD83D\uDCA1',
    label: 'Tip'
  },
  important: {
    bg: 'bg-red-500/8',
    border: 'border-l-red-500',
    icon: '\u2757',
    label: 'Important'
  }
};

export function Callout({ type, title, children }: CalloutProps) {
  const c = calloutConfig[type];
  return (
    <div className={`${c.bg} my-4 rounded-r-lg border-l-4 ${c.border} p-4`}>
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <span>{c.icon}</span>
        <span>{title || c.label}</span>
      </div>
      <div className="text-muted-foreground text-sm">{children}</div>
    </div>
  );
}
