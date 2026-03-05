# Spreadline Review Documentation Page

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a comprehensive, self-contained documentation page at `app/docs/spreadline-review` that explains the entire Spreadline feature for a programmer migrating it to another project.

**Architecture:** Single Next.js page component (TSX) with styled sections using Tailwind CSS variables. Mirrors the format of existing docs pages like `src/app/docs/spreadline_json/page.tsx`. Content-only task — no server/client logic, no hooks, no tests needed.

**Tech Stack:** Next.js page, TSX, Tailwind CSS

---

### Task 1: Create the documentation page

**Files:**
- Create: `src/app/docs/spreadline-review/page.tsx`

**Step 1: Create the page file**

Create a single TSX page with these sections:
1. **Header** — Title, subtitle
2. **Table of Contents** — Linked sections
3. **What is Spreadline?** — Plain English explanation of the concept
4. **Data Model** — CSV file formats, TypeScript interfaces, Zod schemas
5. **Server-Side Architecture** — CSV loading, entity network construction (BFS), data service orchestration
6. **API Specification** — Two endpoints with input/output schemas
7. **Client-Side Architecture** — Hooks, utility transforms, component tree
8. **SpreadLine Layout Engine** — The `src/lib/spreadline/` library (Python port) — 5-phase pipeline
9. **D3 Visualization Layer** — The `src/lib/spreadline-viz/` library — visualizer, chart wrapper
10. **Configuration & Constants** — All tunable values from `const.ts`
11. **Directory Structure** — Full file tree with purpose annotations
12. **Data Flow Diagrams** — End-to-end request/render flow
13. **Migration Guide** — Step-by-step checklist for porting to another project

Content should be accurate to the CURRENT codebase (post-refactor: entity/relationship naming, not author/citation).

**Step 2: Verify it renders**

Run: `npm run build` (lint + build)
Expected: PASS — page compiles without errors

**Step 3: Commit**

```bash
git add src/app/docs/spreadline-review/page.tsx
git commit -m "docs: add comprehensive spreadline-review documentation page"
```
