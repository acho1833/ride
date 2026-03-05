'use client';

import { type ReactNode } from 'react';

/* ── Grid Layout ───────────────────────────────────────────────────── */

interface GridProps {
  children: ReactNode;
  cols?: 2 | 3 | 4;
}

export function Grid({ children, cols = 2 }: GridProps) {
  const colClass = cols === 3 ? 'lg:grid-cols-3' : cols === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-2';
  return <div className={`grid grid-cols-1 gap-4 ${colClass}`}>{children}</div>;
}

/* ── Grid Card ─────────────────────────────────────────────────────── */

interface GridCardProps {
  title: string;
  children: ReactNode;
  icon?: string;
  accent?: string;
}

export function GridCard({ title, children, icon, accent = 'border-border' }: GridCardProps) {
  return (
    <div className={`bg-muted/30 rounded-lg border-l-4 p-4 ${accent}`}>
      <h4 className="mb-2 flex items-center gap-2 font-semibold">
        {icon && <span className="text-lg">{icon}</span>}
        {title}
      </h4>
      <div className="text-muted-foreground text-sm">{children}</div>
    </div>
  );
}

/* ── Data Table ────────────────────────────────────────────────────── */

interface TableProps {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export function DataTable({ headers, rows, caption }: TableProps) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-muted/30 border-b transition-colors last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && <p className="text-muted-foreground mt-2 text-center text-xs italic">{caption}</p>}
    </div>
  );
}

/* ── Badge ─────────────────────────────────────────────────────────── */

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'accent';
  color?: string;
}

export function Badge({ children, variant = 'default', color }: BadgeProps) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
  const styles = {
    default: 'bg-primary/15 text-primary',
    outline: 'border border-border text-muted-foreground',
    accent: color || 'bg-blue-500/15 text-blue-400'
  };
  return <span className={`${base} ${styles[variant]}`}>{children}</span>;
}

/* ── Code Block ────────────────────────────────────────────────────── */

interface CodeBlockProps {
  children: string;
  language?: string;
  filename?: string;
}

export function CodeBlock({ children, language, filename }: CodeBlockProps) {
  return (
    <div className="my-4 overflow-hidden rounded-lg border">
      {(filename || language) && (
        <div className="bg-muted/80 flex items-center gap-2 border-b px-4 py-2">
          {filename && <span className="text-muted-foreground text-xs font-medium">{filename}</span>}
          {language && !filename && <span className="text-muted-foreground text-xs font-medium">{language}</span>}
        </div>
      )}
      <pre className="bg-muted/30 overflow-x-auto p-4">
        <code className="text-sm leading-relaxed">{children}</code>
      </pre>
    </div>
  );
}

/* ── Key-Value Pair ────────────────────────────────────────────────── */

interface KVProps {
  label: string;
  children: ReactNode;
}

export function KV({ label, children }: KVProps) {
  return (
    <div className="flex gap-2 py-1">
      <span className="text-muted-foreground min-w-[140px] shrink-0 text-sm font-medium">{label}:</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

/* ── Analogy Box ───────────────────────────────────────────────────── */

interface AnalogyProps {
  children: ReactNode;
}

export function Analogy({ children }: AnalogyProps) {
  return (
    <div className="my-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-400">
        <span>Think of it this way...</span>
      </div>
      <div className="text-muted-foreground text-sm italic">{children}</div>
    </div>
  );
}

/* ── Inline Code ───────────────────────────────────────────────────── */

interface InlineCodeProps {
  children: ReactNode;
}

export function IC({ children }: InlineCodeProps) {
  return <code className="bg-muted rounded px-1.5 py-0.5 text-sm">{children}</code>;
}
