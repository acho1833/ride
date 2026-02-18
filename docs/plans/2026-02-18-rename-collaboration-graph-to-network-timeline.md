# Rename "Collaboration Graph" to "Network Timeline" Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename the "Collaboration Graph" feature to "Network Timeline" and change the file extension from `.gx` to `.nt`.

**Architecture:** Pure rename — no logic changes. Rename the feature directory, component files, component names, update the file extension constant, and fix all import paths and references.

**Tech Stack:** Next.js, TypeScript, D3.js (no changes to dependencies)

---

## Summary of Changes

| What | From | To |
|------|------|----|
| Feature label | Collaboration Graph | Network Timeline |
| File extension | `.gx` | `.nt` |
| Feature directory | `src/features/collaboration-graph/` | `src/features/network-timeline/` |
| Main component | `CollaborationGraphComponent` | `NetworkTimelineComponent` |
| Legend component | `CollaborationLegendComponent` | `NetworkTimelineLegendComponent` |
| Timeline component | `CollaborationTimelineComponent` | `NetworkTimelineChartComponent` |
| Application ID | `collaboration` | `networkTimeline` |

**Internal domain types** (`Collaboration`, `Collaborator`, `CollaborationData`, `CollaborationNode`, `CollaborationLink`, `ColorTier`) are left unchanged — they describe the data model, not the feature name.

---

### Task 1: Rename feature directory and component files

**Files:**
- Rename: `src/features/collaboration-graph/` → `src/features/network-timeline/`
- Rename: `components/collaboration-graph.component.tsx` → `components/network-timeline.component.tsx`
- Rename: `components/collaboration-legend.component.tsx` → `components/network-timeline-legend.component.tsx`
- Rename: `components/collaboration-timeline.component.tsx` → `components/network-timeline-chart.component.tsx`

**Step 1: Git mv the directory**

```bash
git mv src/features/collaboration-graph src/features/network-timeline
```

**Step 2: Git mv the component files**

```bash
git mv src/features/network-timeline/components/collaboration-graph.component.tsx src/features/network-timeline/components/network-timeline.component.tsx
git mv src/features/network-timeline/components/collaboration-legend.component.tsx src/features/network-timeline/components/network-timeline-legend.component.tsx
git mv src/features/network-timeline/components/collaboration-timeline.component.tsx src/features/network-timeline/components/network-timeline-chart.component.tsx
```

---

### Task 2: Update component names inside renamed files

**Files:**
- Modify: `src/features/network-timeline/components/network-timeline.component.tsx`
- Modify: `src/features/network-timeline/components/network-timeline-legend.component.tsx`
- Modify: `src/features/network-timeline/components/network-timeline-chart.component.tsx`

**Step 1: In `network-timeline.component.tsx`**

- Rename `CollaborationGraphComponent` → `NetworkTimelineComponent` (declaration + export)
- Update import: `CollaborationLegendComponent` → `NetworkTimelineLegendComponent` from `./network-timeline-legend.component`
- Update import: `CollaborationTimelineComponent` → `NetworkTimelineChartComponent` from `./network-timeline-chart.component`
- Update JSX usage of both sub-components
- Update file header comment: "Collaboration Graph Component" → "Network Timeline Component", ".gx files" → ".nt files"

**Step 2: In `network-timeline-legend.component.tsx`**

- Rename `CollaborationLegendComponent` → `NetworkTimelineLegendComponent` (declaration + export)
- Update file header comment

**Step 3: In `network-timeline-chart.component.tsx`**

- Rename `CollaborationTimelineComponent` → `NetworkTimelineChartComponent` (declaration + export)
- Update file header comment

---

### Task 3: Update comments in types.ts, const.ts, utils.ts

**Files:**
- Modify: `src/features/network-timeline/types.ts` — update header comments referencing "Collaboration Graph" and ".gx"
- Modify: `src/features/network-timeline/const.ts` — update header comments referencing "Collaboration Graph" and ".gx"
- Modify: `src/features/network-timeline/utils.ts` — update header comments referencing "Collaboration Graph"

Only comment changes, no code logic changes.

---

### Task 4: Update `src/const.ts`

**File:** Modify `src/const.ts`

Change the FILE_APPLICATIONS entry:

```typescript
// FROM:
{ id: 'collaboration', label: 'Collaboration Graph', extension: '.gx', iconName: 'Users' },

// TO:
{ id: 'networkTimeline', label: 'Network Timeline', extension: '.nt', iconName: 'Users' },
```

---

### Task 5: Update editor-content.component.tsx

**File:** Modify `src/features/editor/components/editor-content.component.tsx`

**Step 1: Update import path and component name**

```typescript
// FROM:
import CollaborationGraphComponent from '@/features/collaboration-graph/components/collaboration-graph.component';

// TO:
import NetworkTimelineComponent from '@/features/network-timeline/components/network-timeline.component';
```

**Step 2: Update switch case**

```typescript
// FROM:
case 'gx':
  return <CollaborationGraphComponent fileId={fileId} fileName={fileName} />;

// TO:
case 'nt':
  return <NetworkTimelineComponent fileId={fileId} fileName={fileName} />;
```

---

### Task 6: Update editor-group.component.tsx

**File:** Modify `src/features/editor/components/editor-group.component.tsx`

```typescript
// FROM (line 50-51):
// Graph-based editors (.ws, .gx) need full height for proper D3 rendering
const isFullHeight = activeFile?.name.endsWith('.ws') || activeFile?.name.endsWith('.gx');

// TO:
// Graph-based editors (.ws, .nt) need full height for proper D3 rendering
const isFullHeight = activeFile?.name.endsWith('.ws') || activeFile?.name.endsWith('.nt');
```

---

### Task 7: Verify build

**Step 1: Run lint**

```bash
npm run lint
```

Expected: No errors related to the rename.

**Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with no broken imports.

---

### Task 8: Commit

```bash
git add -A
git commit -m "refactor: rename Collaboration Graph to Network Timeline (.gx → .nt)"
```
