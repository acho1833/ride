# Pin Highlight Improvements

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the purple flash when panning the timeline, and sync pin visuals when switching between Spreadline and Network Timeline tabs.

**Architecture:** Two independent fixes. (1) Graph Pin Highlight Effect: compute new path sets, diff against previous, only touch DOM elements whose state changed. (2) Spreadline chart: accept `pinnedEntityNames` prop, reapply pin styling after visualizer creation.

**Tech Stack:** D3.js, React refs

---

### Task 1: Eliminate flash — incremental Pin Highlight Effect

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx`

The current Pin Highlight Effect resets ALL nodes/links to default, then re-applies highlights. This causes a visible orange→purple flash on target nodes during timeline panning even when the path hasn't changed.

**Fix:** Store previous highlight state in refs. On each run, compute new sets, compare, and only update elements that actually changed.

**Step 1: Add refs to track previous highlight state (after `linksRef` ~line 167)**

```typescript
const prevHighlightRef = useRef<{
  pathNodeIds: Set<string>;
  pathLinkKeys: Set<string>;
  targetNodeIds: Set<string>;
  intermediateIds: Set<string>;
} | null>(null);
```

**Step 2: Replace the Pin Highlight Effect body**

The new logic:
1. Compute `allPathNodeIds`, `allPathLinkKeys`, `targetNodeIds`, `intermediateIds` (same BFS as today)
2. Compare each set against `prevHighlightRef.current`
3. For nodes: only reset nodes that LEFT the path set, only style nodes that JOINED the path set
4. For links: only reset links that LEFT the path set, only style links that JOINED the path set
5. Store new sets in `prevHighlightRef.current`

Full replacement for the effect body (lines 642-809):

```typescript
useEffect(() => {
  if (!gRef.current || !rawData) return;
  const g = gRef.current;
  const nodes = nodesRef.current;
  const egoId = rawData.egoId;

  const visibleNodeFilter = function (this: SVGGElement) {
    return this.style.display !== 'none';
  };
  const visibleLinkFilter = function (this: SVGLineElement) {
    return this.style.display !== 'none';
  };

  // ── Compute new path sets ──────────────────────────────────────────
  const allPathNodeIds = new Set<string>();
  const allPathLinkKeys = new Set<string>();
  const targetNodeIds = new Set<string>();
  const intermediateIds = new Set<string>();

  if (pinnedEntityNames.length > 0) {
    const currentLinks = linksRef.current;
    const egoDistances = bfsDistances(egoId, currentLinks);

    for (const name of pinnedEntityNames) {
      const targetNode = nodes.find(n => n.name === name);
      if (!targetNode) continue;
      const shortestDist = egoDistances.get(targetNode.id);
      if (shortestDist === undefined) continue;

      targetNodeIds.add(targetNode.id);
      const targetDistances = bfsDistances(targetNode.id, currentLinks);

      for (const [nodeId, distFromEgo] of egoDistances) {
        const distFromTarget = targetDistances.get(nodeId);
        if (distFromTarget !== undefined && distFromEgo + distFromTarget <= shortestDist + 1) {
          allPathNodeIds.add(nodeId);
          if (nodeId !== egoId && !targetNodeIds.has(nodeId)) {
            intermediateIds.add(nodeId);
          }
        }
      }
    }

    for (const link of currentLinks) {
      const s = typeof link.source === 'string' ? link.source : link.source.id;
      const t = typeof link.target === 'string' ? link.target : link.target.id;
      if (allPathNodeIds.has(s) && allPathNodeIds.has(t)) {
        allPathLinkKeys.add([s, t].sort().join('::'));
      }
    }
  }

  // ── Diff against previous state ────────────────────────────────────
  const prev = prevHighlightRef.current;
  const setsEqual = (a: Set<string>, b: Set<string>) =>
    a.size === b.size && [...a].every(v => b.has(v));

  const pathUnchanged =
    prev !== null &&
    setsEqual(allPathNodeIds, prev.pathNodeIds) &&
    setsEqual(allPathLinkKeys, prev.pathLinkKeys) &&
    setsEqual(targetNodeIds, prev.targetNodeIds) &&
    setsEqual(intermediateIds, prev.intermediateIds);

  if (pathUnchanged) return; // nothing changed — skip all DOM work

  // ── Reset nodes that LEFT the path ─────────────────────────────────
  const prevPathNodeIds = prev?.pathNodeIds ?? new Set<string>();
  const prevTargetNodeIds = prev?.targetNodeIds ?? new Set<string>();
  const prevIntermediateIds = prev?.intermediateIds ?? new Set<string>();

  // Nodes that were on the path but no longer are
  const removedPathNodeIds = new Set([...prevPathNodeIds].filter(id => !allPathNodeIds.has(id)));
  // Nodes that were targets but no longer are
  const removedTargetIds = new Set([...prevTargetNodeIds].filter(id => !targetNodeIds.has(id)));
  // Nodes that were intermediate but no longer are
  const removedIntermediateIds = new Set([...prevIntermediateIds].filter(id => !intermediateIds.has(id)));

  // Reset removed nodes to default
  const needsNodeReset = new Set([...removedPathNodeIds, ...removedTargetIds, ...removedIntermediateIds]);
  if (needsNodeReset.size > 0 || (prev !== null && allPathNodeIds.size === 0)) {
    g.select('.nodes')
      .selectAll<SVGGElement, SpreadlineGraphNode>('g')
      .filter(visibleNodeFilter)
      .filter(d => prev !== null && allPathNodeIds.size === 0 ? prevPathNodeIds.has(d.id) || !prevPathNodeIds.has(d.id) && prev.pathNodeIds.size > 0 : needsNodeReset.has(d.id))
      .each(function (d) {
        d3.select(this).style('opacity', null);
        const node = d3.select(this);
        const radius = d.isEgo ? GRAPH_CONFIG.nodeRadius * EGO_SCALE : GRAPH_CONFIG.nodeRadius;
        const iconSize = d.isEgo ? GRAPH_CONFIG.iconSize * EGO_SCALE : GRAPH_CONFIG.iconSize;
        node
          .select('rect')
          .attr('x', -radius)
          .attr('y', -radius)
          .attr('width', radius * 2)
          .attr('height', radius * 2)
          .attr('fill', getNodeFill(d))
          .attr('stroke-width', d.isEgo ? 3 : GRAPH_CONFIG.linkStrokeWidth)
          .attr('filter', d.isEgo ? 'url(#sl-ego-glow)' : null);
        node
          .select('use')
          .attr('x', -iconSize / 2)
          .attr('y', -iconSize / 2)
          .attr('width', iconSize)
          .attr('height', iconSize);
        node
          .select('text')
          .attr('dy', radius + GRAPH_CONFIG.labelOffsetY)
          .attr('font-size', d.isEgo ? '14px' : '12px')
          .attr('font-weight', d.isEgo ? '600' : 'normal');
      });
  }

  // ── Reset links that LEFT the path ─────────────────────────────────
  const prevPathLinkKeys = prev?.pathLinkKeys ?? new Set<string>();

  if (prevPathLinkKeys.size > 0 || allPathLinkKeys.size === 0) {
    g.select('.links')
      .selectAll<SVGLineElement, SpreadlineGraphLink>('line')
      .filter(visibleLinkFilter)
      .each(function (d) {
        const s = typeof d.source === 'string' ? d.source : d.source.id;
        const t = typeof d.target === 'string' ? d.target : d.target.id;
        const key = [s, t].sort().join('::');
        // Reset links that were styled but are no longer on the path
        const wasOnPath = prevPathLinkKeys.has(key);
        const wasOff = prev !== null && !prevPathLinkKeys.has(key) && prev.pathNodeIds.size > 0;
        const isOnPath = allPathLinkKeys.has(key);
        if ((wasOnPath && !isOnPath) || (wasOff && allPathNodeIds.size === 0)) {
          d3.select(this).style('stroke', null).style('stroke-width', null).style('stroke-opacity', null);
        }
      });
  }

  // ── If no pinned entities, clear ref and return ────────────────────
  if (allPathNodeIds.size === 0) {
    // Full clear: reset ALL previously styled elements
    if (prev !== null && prev.pathNodeIds.size > 0) {
      g.select('.nodes')
        .selectAll<SVGGElement, SpreadlineGraphNode>('g')
        .filter(visibleNodeFilter)
        .style('opacity', null)
        .each(function (d) {
          // ...reset handled above via needsNodeReset
        });
      g.select('.links')
        .selectAll<SVGLineElement, SpreadlineGraphLink>('line')
        .filter(visibleLinkFilter)
        .style('stroke', null)
        .style('stroke-width', null)
        .style('stroke-opacity', null);
    }
    prevHighlightRef.current = { pathNodeIds: allPathNodeIds, pathLinkKeys: allPathLinkKeys, targetNodeIds, intermediateIds };
    return;
  }

  // ── Apply highlight to path links ──────────────────────────────────
  g.select('.links')
    .selectAll<SVGLineElement, SpreadlineGraphLink>('line')
    .filter(visibleLinkFilter)
    .each(function (d) {
      const s = typeof d.source === 'string' ? d.source : d.source.id;
      const t = typeof d.target === 'string' ? d.target : d.target.id;
      const key = [s, t].sort().join('::');
      if (allPathLinkKeys.has(key)) {
        d3.select(this)
          .style('stroke', 'var(--primary)')
          .style('stroke-width', `${GRAPH_CONFIG.linkStrokeWidth * 2}px`)
          .style('stroke-opacity', '1');
      } else {
        d3.select(this).style('stroke-opacity', '0.15');
      }
    });

  // ── Dim non-path nodes ─────────────────────────────────────────────
  g.select('.nodes')
    .selectAll<SVGGElement, SpreadlineGraphNode>('g')
    .filter(visibleNodeFilter)
    .filter(d => !allPathNodeIds.has(d.id))
    .style('opacity', 0.25);

  // ── Style intermediate path nodes ──────────────────────────────────
  g.select('.nodes')
    .selectAll<SVGGElement, SpreadlineGraphNode>('g')
    .filter(visibleNodeFilter)
    .filter(d => intermediateIds.has(d.id))
    .each(function () {
      d3.select(this).select('rect').transition().duration(GRAPH_TIME_TRANSITION_MS).attr('fill', EGO_NODE_COLOR);
    });

  // ── Style target nodes ─────────────────────────────────────────────
  const egoRadius = GRAPH_CONFIG.nodeRadius * EGO_SCALE;
  const egoIconSize = GRAPH_CONFIG.iconSize * EGO_SCALE;
  g.select('.nodes')
    .selectAll<SVGGElement, SpreadlineGraphNode>('g')
    .filter(visibleNodeFilter)
    .filter(d => targetNodeIds.has(d.id))
    .each(function () {
      const node = d3.select(this);
      node
        .select('rect')
        .transition()
        .duration(GRAPH_TIME_TRANSITION_MS)
        .attr('x', -egoRadius)
        .attr('y', -egoRadius)
        .attr('width', egoRadius * 2)
        .attr('height', egoRadius * 2)
        .attr('fill', SPREADLINE_SELECTED_COLOR)
        .attr('stroke-width', 3)
        .attr('filter', 'url(#sl-selected-glow)');
      node
        .select('use')
        .transition()
        .duration(GRAPH_TIME_TRANSITION_MS)
        .attr('x', -egoIconSize / 2)
        .attr('y', -egoIconSize / 2)
        .attr('width', egoIconSize)
        .attr('height', egoIconSize);
      node
        .select('text')
        .transition()
        .duration(GRAPH_TIME_TRANSITION_MS)
        .attr('dy', egoRadius + GRAPH_CONFIG.labelOffsetY)
        .attr('font-size', '14px')
        .attr('font-weight', '600');
    });

  // ── Store current state ────────────────────────────────────────────
  prevHighlightRef.current = { pathNodeIds: allPathNodeIds, pathLinkKeys: allPathLinkKeys, targetNodeIds, intermediateIds };
}, [pinnedEntityNames, rawData, selectedTimes, filteredEntityNames]);
```

WAIT — the above is getting complex and fragile. The diff logic for nodes that "left" vs "joined" the path set is hairy and bug-prone.

**Simpler approach:** Keep the full-apply logic but use a **fast bail-out**. Compute the new sets, compare with previous. If identical, skip all DOM work. If different, do the full reset-and-apply (but since this only happens when the path truly changes, no flash).

This gives us:
- **Pan with same path**: effect runs, sets match → bail → no DOM touch → no flash
- **Pin/unpin or path change**: sets differ → full reset + apply → correct

**Revised Step 2: Add early bail-out to existing effect**

Before the reset code (line 656), insert:

```typescript
// Compute new path sets BEFORE any DOM work
const allPathNodeIds = new Set<string>();
const allPathLinkKeys = new Set<string>();
const targetNodeIds = new Set<string>();
const intermediateIds = new Set<string>();

if (pinnedEntityNames.length > 0) {
  const currentLinks = linksRef.current;
  const egoDistances = bfsDistances(egoId, currentLinks);
  for (const name of pinnedEntityNames) {
    const targetNode = nodes.find(n => n.name === name);
    if (!targetNode) continue;
    const shortestDist = egoDistances.get(targetNode.id);
    if (shortestDist === undefined) continue;
    targetNodeIds.add(targetNode.id);
    const targetDistances = bfsDistances(targetNode.id, currentLinks);
    for (const [nodeId, distFromEgo] of egoDistances) {
      const distFromTarget = targetDistances.get(nodeId);
      if (distFromTarget !== undefined && distFromEgo + distFromTarget <= shortestDist + 1) {
        allPathNodeIds.add(nodeId);
        if (nodeId !== egoId && !targetNodeIds.has(nodeId)) intermediateIds.add(nodeId);
      }
    }
  }
  for (const link of linksRef.current) {
    const s = typeof link.source === 'string' ? link.source : link.source.id;
    const t = typeof link.target === 'string' ? link.target : link.target.id;
    if (allPathNodeIds.has(s) && allPathNodeIds.has(t))
      allPathLinkKeys.add([s, t].sort().join('::'));
  }
}

// Bail if path unchanged
const prev = prevHighlightRef.current;
const setsEqual = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(v => b.has(v));
if (prev && setsEqual(allPathNodeIds, prev.pathNodeIds) && setsEqual(allPathLinkKeys, prev.pathLinkKeys)
    && setsEqual(targetNodeIds, prev.targetNodeIds) && setsEqual(intermediateIds, prev.intermediateIds)) {
  return;
}

// ... existing reset + apply code ...

// At the end, store current state
prevHighlightRef.current = { pathNodeIds: allPathNodeIds, pathLinkKeys: allPathLinkKeys, targetNodeIds, intermediateIds };
```

Then remove the duplicate path computation that currently exists after the reset (lines 693-737), since we computed it above.

**Step 3: Build and verify**

```bash
npx tsc --noEmit && npm run build
```

**Step 4: Commit**

```bash
git add src/features/spreadlines/components/spreadline-graph.component.tsx
git commit -m "fix(spreadline): skip pin highlight DOM work when path unchanged"
```

---

### Task 2: Sync pin visuals across tabs

**Files:**
- Modify: `src/lib/spreadline-viz/spreadline-visualizer.ts` — add `applyPins(names)` public method
- Modify: `src/lib/spreadline-viz/spreadline-chart.tsx` — accept `pinnedEntityNames` prop, call `applyPins` after visualizer creation
- Modify: `src/features/spreadlines/components/spreadline.component.tsx` — pass `pinnedEntityNames` to chart

**Step 1: Add `applyPins` method to visualizer** (after `clearPins` at ~line 1428)

```typescript
/** Apply pin styling for the given entity names (used to sync React state with visualizer) */
applyPins(names: string[]): void {
  // Clear any existing pins first
  this.clearPinsVisualOnly();
  this.members.pinned = [];

  for (const name of names) {
    const storyline = this.storylines.find(s => s.name === name);
    if (!storyline) continue;
    const ele = document.getElementById(`label-${name}`);
    if (!ele) continue;

    ele.setAttribute('pin', '1');
    this.members.pinned.push(name);

    d3.selectAll(`.line-${storyline.id}.path-movable`).style('stroke', 'var(--primary)').style('stroke-width', '8px');
    d3.selectAll(`.line-${storyline.id}.marks`).style('fill', 'var(--primary)');
    const labelEl = d3.select(ele);
    labelEl.selectAll('text.labels').style('fill', 'var(--primary)');
    labelEl.select('.mark-links').style('stroke', 'var(--primary)');
  }
}

/** Clear pin visuals without firing callbacks */
private clearPinsVisualOnly(): void {
  for (const name of [...this.members.pinned]) {
    const storyline = this.storylines.find(s => s.name === name);
    if (!storyline) continue;
    d3.selectAll(`.line-${storyline.id}.path-movable`).style('stroke', null).style('stroke-width', null);
    d3.selectAll(`.line-${storyline.id}.marks`).style('fill', null);
    const labelEl = d3.select(document.getElementById(`label-${name}`));
    labelEl.attr('pin', '0');
    labelEl.selectAll('text.labels').style('fill', null);
    labelEl.select('.mark-links').style('stroke', null);
  }
}
```

**Step 2: Add `pinnedEntityNames` prop to SpreadLineChart and call `applyPins`**

In `SpreadLineChartProps` interface (~line 119), add:

```typescript
/** Currently pinned entity names (for syncing visual state from React) */
pinnedEntityNames?: string[];
```

In the component, add a ref and effect:

```typescript
const pinnedEntityNamesRef = useValueRef(pinnedEntityNames ?? []);
```

At the end of `updateContent()` (after `visualizerRef.current = visualizer`, ~line 271), add:

```typescript
if (pinnedEntityNamesRef.current.length > 0) {
  visualizer.applyPins(pinnedEntityNamesRef.current);
}
```

At the end of `initVisualization()` (after `visualizer.applyFilter(...)`, just before `visualizerRef.current = visualizer`), add the same:

```typescript
if (pinnedEntityNamesRef.current.length > 0) {
  visualizer.applyPins(pinnedEntityNamesRef.current);
}
visualizerRef.current = visualizer;
```

**Step 3: Pass `pinnedEntityNames` from spreadline.component.tsx to SpreadLineChart**

In `spreadline.component.tsx`, the `SpreadLineChart` usage (~line 386), add the prop:

```tsx
<SpreadLineChart
  ref={chartRef}
  key={resetKey}
  data={computedData}
  config={config}
  resetKey={resetKey}
  blocksFilter={blocksFilter}
  crossingOnly={crossingOnly}
  onZoomChange={handleZoomChange}
  highlightTimes={highlightTimes && highlightTimes.length > 0 ? highlightTimes : undefined}
  onTimeClick={onTimeClick}
  onHighlightRangeChange={onHighlightRangeChange}
  onEntityPin={onEntityPin}
  pinnedEntityNames={pinnedEntityNames}
/>
```

**Step 4: Build and verify**

```bash
npx tsc --noEmit && npm run build
```

**Step 5: Commit**

```bash
git add src/lib/spreadline-viz/spreadline-visualizer.ts src/lib/spreadline-viz/spreadline-chart.tsx src/features/spreadlines/components/spreadline.component.tsx
git commit -m "feat(spreadline): sync pin visuals across tabs via applyPins"
```
