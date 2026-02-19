# Spreadline Stable Node Positioning — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep existing nodes stable when changing the time frame — only new nodes get force-layout'd, exiting nodes hide in place, returning nodes fade back where they were.

**Architecture:** Single-file change to the Time-Change Effect in `spreadline-graph.component.tsx`. Add a persistent node registry (`nodeRegistryRef`) that remembers positions of all ever-seen nodes. Modify the D3 data join to hide (not remove) exiting nodes, and detect returning nodes in the update selection. Modify the force simulation to only apply full forces to brand-new nodes.

**Tech Stack:** D3.js force simulation, React refs, SVG display/opacity

---

## Key Insight: D3 Data Join Does the Categorization

Since we stop removing exit nodes from the DOM, the D3 `.data()` join naturally handles categorization on subsequent renders:

- **UPDATE selection** = persisting nodes (were visible, still visible) + returning nodes (were hidden via `display:none`, now back in data)
- **ENTER selection** = truly new nodes (no DOM element with that key)
- **EXIT selection** = newly exiting nodes (visible → hidden) + already hidden nodes (still not in data)

We detect returning vs persisting in UPDATE by checking if the DOM element has `display: none`.

---

## File: `src/features/spreadlines/components/spreadline-graph.component.tsx`

### Task 1: Add node registry ref

**Step 1: Add the ref declaration**

After line 153 (`nodeLinkMapRef`), add:

```typescript
const nodeRegistryRef = useRef<Map<string, { x: number; y: number }>>(new Map());
```

This stores last-known positions for ALL ever-seen nodes, surviving across time changes.

**Step 2: Verify build**

Run: `npm run build`

---

### Task 2: Modify node position initialization to use registry

**Step 1: Update position preservation logic**

Replace lines 304-309 (the node position preservation block):

```typescript
// Current code:
const prevNodesMap = new Map(nodesRef.current.map(n => [n.id, n]));
const nodes: SpreadlineGraphNode[] = graphData.nodes.map(n => {
  const prev = prevNodesMap.get(n.id);
  return { ...n, x: prev?.x ?? n.x, y: prev?.y ?? n.y };
});
```

With:

```typescript
// Preserve positions: check active nodes first, then registry for returning nodes
const prevNodesMap = new Map(nodesRef.current.map(n => [n.id, n]));
const registry = nodeRegistryRef.current;
const nodes: SpreadlineGraphNode[] = graphData.nodes.map(n => {
  const prev = prevNodesMap.get(n.id);
  if (prev) return { ...n, x: prev.x, y: prev.y };
  const reg = registry.get(n.id);
  if (reg) return { ...n, x: reg.x, y: reg.y };
  return { ...n };
});
```

Now returning nodes (hidden but in registry) get their last-known position instead of undefined.

**Step 2: Build categorization sets** (add right after the `nodes` array creation)

```typescript
const enteringIds = new Set<string>();
const returningIds = new Set<string>();
for (const n of nodes) {
  if (!prevNodesMap.has(n.id) && !registry.has(n.id)) {
    enteringIds.add(n.id);
  } else if (!prevNodesMap.has(n.id) && registry.has(n.id)) {
    returningIds.add(n.id);
  }
}
```

**Step 3: Verify build**

Run: `npm run build`

---

### Task 3: Modify exit handling — hide instead of remove

**Step 1: Change link exit** (line 325)

Replace:
```typescript
linkJoin.exit().transition().duration(GRAPH_TIME_TRANSITION_MS).attr('stroke-opacity', 0).remove();
```

With:
```typescript
linkJoin
  .exit()
  .filter(function () { return (this as SVGLineElement).style.display !== 'none'; })
  .transition()
  .duration(GRAPH_TIME_TRANSITION_MS)
  .attr('stroke-opacity', 0)
  .on('end', function () { d3.select(this).style('display', 'none'); });
```

The `.filter()` skips links that are already hidden (from previous exits) — no re-animation.

**Step 2: Change node exit** (lines 347-356)

Replace:
```typescript
nodeJoin
  .exit()
  .transition()
  .duration(GRAPH_TIME_TRANSITION_MS)
  .style('opacity', 0)
  .attr('transform', d => {
    const nd = d as SpreadlineGraphNode;
    return `translate(${nd.x ?? 0},${nd.y ?? 0}) scale(0.3)`;
  })
  .remove();
```

With:
```typescript
nodeJoin
  .exit()
  .filter(function () { return (this as SVGGElement).style.display !== 'none'; })
  .transition()
  .duration(GRAPH_TIME_TRANSITION_MS)
  .style('opacity', 0)
  .on('end', function () { d3.select(this).style('display', 'none'); });
```

Key changes:
- No `.remove()` — element stays in DOM
- No `scale(0.3)` — just fade opacity (simpler return handling)
- `.filter()` skips already-hidden nodes
- On transition end, set `display: none` for GPU savings

**Step 3: Verify build**

Run: `npm run build`

---

### Task 4: Handle returning nodes and links in update selection

**Step 1: Handle returning links in update selection**

After the existing link enter/merge code (around line 338 `const linkMerged = ...`), add handling for returning links:

```typescript
// Show returning links (were hidden, now back in data)
linkJoin
  .filter(function () { return (this as SVGLineElement).style.display === 'none'; })
  .style('display', '')
  .attr('stroke-opacity', 0)
  .transition()
  .duration(GRAPH_TIME_TRANSITION_MS)
  .attr('stroke-opacity', GRAPH_CONFIG.linkStrokeOpacity);
```

**Step 2: Handle returning nodes in update selection**

After line 380 (`nodeJoin.interrupt().style('opacity', 1);`), add returning node handling. Replace those two lines:

```typescript
// Current:
nodeJoin.interrupt().style('opacity', 1);
nodeJoin.select('rect').transition().duration(GRAPH_TIME_TRANSITION_MS).attr('fill', getNodeFill);
```

With:

```typescript
// Persisting nodes — ensure visible, update fill
nodeJoin
  .filter(function () { return (this as SVGGElement).style.display !== 'none'; })
  .interrupt()
  .style('opacity', 1);
nodeJoin
  .filter(function () { return (this as SVGGElement).style.display !== 'none'; })
  .select('rect')
  .transition()
  .duration(GRAPH_TIME_TRANSITION_MS)
  .attr('fill', getNodeFill);

// Returning nodes — unhide and fade in at last known position
nodeJoin
  .filter(function () { return (this as SVGGElement).style.display === 'none'; })
  .style('display', '')
  .style('opacity', 0)
  .attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
  .transition()
  .duration(GRAPH_TIME_TRANSITION_MS)
  .style('opacity', 1);
nodeJoin
  .filter(function () { return (this as SVGGElement).style.display === 'none'; })
  .select('rect')
  .attr('fill', getNodeFill);
```

**Important**: The returning node filter must run BEFORE the persisting node code sets `display: ''`, otherwise the filter won't catch them. Actually, since we're filtering on the same `nodeJoin` selection (update), each `.filter()` operates on the original state. The returning nodes filter will correctly find `display: none` elements because the persisting filter doesn't modify display.

Wait — there's a sequencing issue. The returning nodes `.style('display', '')` runs immediately (not in a transition), so if both filters execute, the returning code sets display to '' first, then the persisting filter re-checks... Actually no, D3 selections execute synchronously in order. The first filter runs on the original DOM state, the second filter also runs on the original DOM state since filter just creates a sub-selection. But `.style('display', '')` modifies the DOM immediately.

To be safe, handle returning nodes FIRST (before persisting nodes touch anything):

```typescript
// Returning nodes — unhide and fade in at last known position (MUST be before persisting handling)
const returningNodeSelection = nodeJoin
  .filter(function () { return (this as SVGGElement).style.display === 'none'; });
returningNodeSelection
  .style('display', '')
  .style('opacity', 0)
  .attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
  .transition()
  .duration(GRAPH_TIME_TRANSITION_MS)
  .style('opacity', 1);
returningNodeSelection.select('rect').attr('fill', getNodeFill);

// Persisting nodes — ensure visible, update fill
nodeJoin.interrupt().style('opacity', 1);
nodeJoin.select('rect').transition().duration(GRAPH_TIME_TRANSITION_MS).attr('fill', getNodeFill);
```

Actually this is simpler: we run returning first to unhide them, then the persisting block runs on all update nodes (including the now-unhidden returning ones) which is fine — it just ensures they're fully visible and updates fill.

**Step 3: Verify build**

Run: `npm run build`

---

### Task 5: Modify force simulation for stable positioning

**Step 1: Pin ego and set fx/fy for persisting/returning nodes**

Replace the block at lines 483-504 (the `else` branch for non-first-render):

```typescript
// Current code in the else branch:
} else {
  // Position new nodes near ego (existing nodes keep inherited positions)
  for (const n of nodes) {
    if (!prevNodesMap.has(n.id)) {
      n.x = spawnX + (Math.random() - 0.5) * 40;
      n.y = spawnY + (Math.random() - 0.5) * 40;
    }
  }

  // Animated simulation — all nodes free to move so hop forces take effect
  simulation
    .alpha(0.5)
    .alphaDecay(0.05)
    .on('tick', () => { ... })
    .restart();
}
```

With:

```typescript
} else {
  // Pin ego to center, fix persisting/returning in place, position new nodes near ego
  for (const n of nodes) {
    if (n.isEgo) {
      n.fx = width / 2;
      n.fy = height / 2;
    } else if (enteringIds.has(n.id)) {
      n.x = spawnX + (Math.random() - 0.5) * 40;
      n.y = spawnY + (Math.random() - 0.5) * 40;
    } else {
      // Persisting or returning — hold position, collision only
      n.fx = n.x;
      n.fy = n.y;
    }
  }

  // Animated simulation — only entering nodes get full forces
  simulation
    .alpha(0.5)
    .alphaDecay(0.05)
    .on('tick', () => {
      linkMerged
        .attr('x1', d => (d.source as SpreadlineGraphNode).x ?? 0)
        .attr('y1', d => (d.source as SpreadlineGraphNode).y ?? 0)
        .attr('x2', d => (d.target as SpreadlineGraphNode).x ?? 0)
        .attr('y2', d => (d.target as SpreadlineGraphNode).y ?? 0);
      nodeMerged.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    })
    .on('end', () => {
      // Release fx/fy on non-ego nodes so future collision nudges work
      for (const n of nodes) {
        if (!n.isEgo) {
          n.fx = null;
          n.fy = null;
        }
      }
    })
    .restart();
}
```

**Step 2: Pin ego on first render too**

In the first-render branch (around line 457), add ego pinning BEFORE the simulation ticks:

```typescript
if (isFirstRender) {
  // Pin ego to center
  for (const n of nodes) {
    if (n.isEgo) {
      n.fx = width / 2;
      n.fy = height / 2;
      break;
    }
  }

  // First render: synchronous layout
  for (let i = 0; i < GRAPH_CONFIG.initialLayoutTicks; i++) {
    simulation.tick();
  }
  // ... rest of first render code unchanged
```

**Step 3: Verify build**

Run: `npm run build`

---

### Task 6: Update node registry at end of effect

**Step 1: Update registry after simulation setup**

Replace line 507:

```typescript
nodesRef.current = nodes;
```

With:

```typescript
// Update active nodes ref (only current simulation nodes)
nodesRef.current = nodes;

// Update registry with all visible node positions
for (const n of nodes) {
  if (n.x != null && n.y != null) {
    registry.set(n.id, { x: n.x, y: n.y });
  }
}
```

The registry grows monotonically — exiting nodes keep their last-known position from when they were last in `nodes`.

**Step 2: Verify build**

Run: `npm run build`

---

### Task 7: Fix pin highlight effect to skip hidden nodes

**Step 1: Filter hidden nodes from pin highlight reset**

In the Pin Highlight Effect (line 521), the first line resets opacity on ALL nodes:

```typescript
g.select('.nodes').selectAll<SVGGElement, SpreadlineGraphNode>('g').style('opacity', null);
```

This would override the `opacity: 0` on exiting nodes mid-transition. Add a filter to all node selections in the pin highlight effect. Replace the reset block (lines 521-548):

At the start of the pin highlight effect, after `const g = gRef.current;`, add a helper:

```typescript
const visibleNodes = g.select('.nodes')
  .selectAll<SVGGElement, SpreadlineGraphNode>('g')
  .filter(function () { return (this as SVGGElement).style.display !== 'none'; });
```

Then replace all `g.select('.nodes').selectAll<SVGGElement, SpreadlineGraphNode>('g')` in the pin highlight effect with `visibleNodes` (for the reset block and the dim/style blocks at lines 625-672).

**Step 2: Verify build**

Run: `npm run build`

---

### Task 8: Build and manual verification

**Step 1: Full build**

Run: `npm run build`
Expected: No errors

**Step 2: Commit**

```bash
git add src/features/spreadlines/components/spreadline-graph.component.tsx
git commit -m "feat: stable node positioning in spreadline graph on time change"
```

---

## Summary of All Changes

| Location | What Changes |
|----------|-------------|
| Line ~153 | Add `nodeRegistryRef` ref |
| Lines ~304-312 | Use registry for returning node positions + build categorization sets |
| Line ~325 | Link exit: hide instead of remove |
| Lines ~347-356 | Node exit: fade opacity → display:none (no scale, no remove) |
| Lines ~335-338 | Returning links: unhide + fade in |
| Lines ~378-382 | Returning nodes: unhide + fade in at last position |
| Lines ~457-460 | First render: pin ego to center |
| Lines ~483-504 | Time change: pin ego, fx/fy for persisting/returning, full forces only for entering |
| Line ~507 | Update nodeRegistryRef with visible node positions |
| Lines ~521-548, 625-672 | Pin highlight: filter to visible nodes only |
