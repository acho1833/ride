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
        className="bg-muted/50 hover:bg-muted flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
      >
        <span className="flex items-center gap-2 font-semibold">
          <span className={`inline-block transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>&#9654;</span>
          {title}
          {badge && <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-xs font-normal">{badge}</span>}
        </span>
      </button>
      {open && <div className="border-t p-4">{children}</div>}
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
    <div>
      <div className="mb-4 flex gap-1 border-b">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              active === i ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs[active].content}</div>
    </div>
  );
}

/* ── Step-by-step with progress ──────────────────────────────────── */

interface StepProps {
  number: number;
  title: string;
  children: ReactNode;
}

export function Step({ number, title, children }: StepProps) {
  return (
    <div className="mb-6 flex gap-4">
      <div className="bg-primary text-primary-foreground flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold">
        {number}
      </div>
      <div className="flex-1 pt-1">
        <h4 className="mb-2 text-lg font-semibold">{title}</h4>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

/* ── Callout ─────────────────────────────────────────────────────── */

interface CalloutProps {
  type: 'info' | 'warning' | 'tip' | 'important';
  title?: string;
  children: ReactNode;
}

const calloutStyles = {
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'i', label: 'Info' },
  warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '!', label: 'Warning' },
  tip: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: '*', label: 'Tip' },
  important: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: '!!', label: 'Important' }
};

export function Callout({ type, title, children }: CalloutProps) {
  const s = calloutStyles[type];
  return (
    <div className={`${s.bg} border ${s.border} my-4 rounded-lg p-4`}>
      <div className="mb-1 font-semibold">{title || s.label}</div>
      <div className="text-muted-foreground text-sm">{children}</div>
    </div>
  );
}
