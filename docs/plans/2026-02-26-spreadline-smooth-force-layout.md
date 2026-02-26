# Spreadline Smooth Force Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the force-directed graph animation smooth and natural when the user drags the time range, by using smarter initial positions for new nodes, removing rigid pinning of settled nodes, and tuning simulation parameters.

**Architecture:** Three changes in the `else` branch (non-first-render) of the force simulation in `spreadline-graph.component.tsx`: (1) smart neighbor-based spawn positioning for new nodes, (2) remove `settledNodeIdsRef` pinning so all nodes can drift naturally, (3) tune alpha/alphaDecay/velocityDecay for a slower, smoother animation. Constants go in `const.ts`.

**Tech Stack:** D3.js force simulation, React, TypeScript

---

### Task 1: Add simulation tuning constants to `const.ts`

**Files:**
- Modify: `src/features/spreadlines/const.ts:104-119`

**Step 1: Add three new constants after the existing hop-aware constants**

Add these constants after `GRAPH_RADIAL_STRENGTH` (line 119) in the "Hop-Aware Graph Layout Constants" section:

```typescript
/** Force alpha for time-range updates (lower = gentler start) */
export const GRAPH_UPDATE_ALPHA = 0.3;

/** Alpha decay for time-range updates (lower = more ticks, smoother cooling) */
export const GRAPH_UPDATE_ALPHA_DECAY = 0.03;

/** Velocity decay for time-range updates (higher = more damping, less overshoot) */
export const GRAPH_UPDATE_VELOCITY_DECAY = 0.6;

/** Random offset range when spawning new nodes near a neighbor (px) */
export const GRAPH_NEIGHBOR_SPAWN_OFFSET = 30;
```

**Step 2: Commit**

```bash
git add src/features/spreadlines/const.ts
git commit -m "feat(spreadline): add force simulation tuning constants for smooth layout"
```

---

### Task 2: Import new constants in graph component

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx:20-33`

**Step 1: Add new constant imports**

Add `GRAPH_UPDATE_ALPHA`, `GRAPH_UPDATE_ALPHA_DECAY`, `GRAPH_UPDATE_VELOCITY_DECAY`, and `GRAPH_NEIGHBOR_SPAWN_OFFSET` to the existing import block from `@/features/spreadlines/const`.

---

### Task 3: Replace unsettled-node repositioning with smart neighbor-based positioning

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx:668-675`

**Step 1: Replace the `else` block's node positioning logic (lines 669-675)**

Replace this code:
```typescript
      // Unsettled nodes (new or interrupted mid-animation) spawn near ego
      for (const n of nodes) {
        if (!n.isEgo && !settled.has(n.id)) {
          n.x = spawnX + (Math.random() - 0.5) * 40;
          n.y = spawnY + (Math.random() - 0.5) * 40;
        }
      }
```

With this smarter positioning that only targets truly new nodes (not in `prevNodesMap`):
```typescript
      // Smart positioning for truly new nodes (not in previous render)
      for (const n of nodes) {
        if (n.isEgo || prevNodesMap.has(n.id)) continue;
        // Find a connected neighbor that already has a position
        const neighbor = links
          .map(l => {
            const sId = typeof l.source === 'string' ? l.source : l.source.id;
            const tId = typeof l.target === 'string' ? l.target : l.target.id;
            if (sId === n.id) return nodes.find(nd => nd.id === tId);
            if (tId === n.id) return nodes.find(nd => nd.id === sId);
            return undefined;
          })
          .find(nd => nd?.x != null && nd?.y != null);

        if (neighbor?.x != null && neighbor?.y != null) {
          n.x = neighbor.x + (Math.random() - 0.5) * GRAPH_NEIGHBOR_SPAWN_OFFSET * 2;
          n.y = neighbor.y + (Math.random() - 0.5) * GRAPH_NEIGHBOR_SPAWN_OFFSET * 2;
        } else {
          n.x = spawnX + (Math.random() - 0.5) * GRAPH_NEIGHBOR_SPAWN_OFFSET * 2;
          n.y = spawnY + (Math.random() - 0.5) * GRAPH_NEIGHBOR_SPAWN_OFFSET * 2;
        }
      }
```

Key differences from old code:
- Only targets truly **new** nodes (skips nodes already in `prevNodesMap` — those keep their current position naturally)
- Tries to find a connected neighbor first, spawns near it
- Falls back to ego position only if no neighbor has a position

---

### Task 4: Remove settled-node fx/fy pinning and tune simulation parameters

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx:624-635` (pinning block)
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx:677-698` (simulation params)

**Step 1: Update pinning block to only pin ego and user-pinned entities**

The pinning block (lines 624-635) already does exactly this — it only pins ego and user-pinned entities. No change needed here. The key change is that we removed the `settled.has(n.id)` check from the positioning loop above, so settled nodes no longer get special treatment.

**Step 2: Update simulation parameters (lines 678-680)**

Replace:
```typescript
      simulation
        .alpha(0.5)
        .alphaDecay(0.05)
```

With:
```typescript
      simulation
        .alpha(GRAPH_UPDATE_ALPHA)
        .alphaDecay(GRAPH_UPDATE_ALPHA_DECAY)
        .velocityDecay(GRAPH_UPDATE_VELOCITY_DECAY)
```

**Step 3: Simplify the `on('end')` callback — just update registry, no settled tracking**

Replace:
```typescript
        .on('end', () => {
          // Mark all current nodes as settled and update registry
          for (const n of nodes) {
            settled.add(n.id);
            if (n.x != null && n.y != null) {
              registry.set(n.id, { x: n.x, y: n.y });
            }
          }
        })
```

With:
```typescript
        .on('end', () => {
          // Save final positions to registry
          for (const n of nodes) {
            if (n.x != null && n.y != null) {
              registry.set(n.id, { x: n.x, y: n.y });
            }
          }
        })
```

---

### Task 5: Remove `settledNodeIdsRef` (dead code cleanup)

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx`

**Step 1: Remove the ref declaration (line 197)**

Remove:
```typescript
const settledNodeIdsRef = useRef<Set<string>>(new Set());
```

**Step 2: Remove the `settled` alias (line 409)**

Remove:
```typescript
const settled = settledNodeIdsRef.current;
```

**Step 3: Remove `settled.add()` in the first-render branch (lines 651-654)**

Remove:
```typescript
      // Mark all initial nodes as settled
      for (const n of nodes) {
        settled.add(n.id);
      }
```

**Step 4: Commit all changes**

```bash
git add src/features/spreadlines/components/spreadline-graph.component.tsx src/features/spreadlines/const.ts
git commit -m "feat(spreadline): smooth force layout with neighbor-based positioning and tuned simulation"
```

---

### Task 6: Manual verification

**Step 1: Start dev server and test**

Run: `npm run dev`

Test these scenarios:
1. Open a spreadline graph — first render should work as before
2. Drag time range from 2022 to 2021 — nodes should animate smoothly (~2s)
3. Drag time range again before animation settles — existing nodes should continue from current position, no teleporting
4. New nodes should appear near their connected neighbors, not explode from center
5. User-pinned entities should stay fixed
6. Ego should stay centered

**Step 2: Run lint**

Run: `npm run lint`
Expected: No new errors

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/features/spreadlines/const.ts` | Add 4 tuning constants |
| `src/features/spreadlines/components/spreadline-graph.component.tsx` | Smart neighbor positioning, tuned simulation, remove `settledNodeIdsRef` |

Total: **2 files**, minimal surface area.
