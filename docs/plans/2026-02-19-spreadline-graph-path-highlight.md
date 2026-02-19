# Spreadline Graph Path Highlight Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When an entity is pinned in the spreadline chart, highlight the shortest path from ego to that entity in the force graph — path links turn primary blue, target node styled identically to ego (size, color, glow, border).

**Architecture:** Add `onEntityPin` callback from SpreadLinesVisualizer → SpreadLineChart → SpreadlineComponent → SpreadlineTabComponent (state) → SpreadlineGraphComponent (prop). Graph uses BFS on current links to find ego→target path, then applies ego styling to target node and primary color to path links via D3 inline styles.

**Tech Stack:** D3.js, React state/props, existing SpreadLinesVisualizer callback pattern

---

### Task 1: Add `onEntityPin` callback to SpreadLinesVisualizer

**Files:**
- Modify: `src/lib/spreadline-viz/spreadline-visualizer.ts`

**Step 1: Add callback property**

Add to the class properties (near line 79, alongside existing callbacks):

```typescript
onEntityPin?: (name: string | null) => void;
```

**Step 2: Fire callback in `_linePin`**

In `_linePin`, after the pin/unpin logic, fire the callback. In the `if (pinned)` block (unpinning), fire `null`. In the `else` block (pinning), fire `d.name`:

```typescript
// At end of the if (pinned) block:
this.onEntityPin?.(null);

// At end of the else block:
this.onEntityPin?.(d.name);
```

**Step 3: Commit**

```
feat: add onEntityPin callback to SpreadLinesVisualizer
```

---

### Task 2: Wire `onEntityPin` through SpreadLineChart

**Files:**
- Modify: `src/lib/spreadline-viz/spreadline-chart.tsx`

**Step 1: Add prop to interface**

Add to `SpreadLineChartProps` (near line 75):

```typescript
/** Callback when an entity is pinned/unpinned in the chart */
onEntityPin?: (name: string | null) => void;
```

**Step 2: Destructure and create ref**

In the component destructuring, add `onEntityPin`. Create a callback ref:

```typescript
const onEntityPinRef = useCallbackRef(onEntityPin);
```

**Step 3: Wire to visualizer**

In `initVisualization()`, after the existing `visualizer.onFilterChange` line (line ~226), add:

```typescript
visualizer.onEntityPin = name => onEntityPinRef.current?.(name);
```

**Step 4: Commit**

```
feat: wire onEntityPin through SpreadLineChart wrapper
```

---

### Task 3: Wire `onEntityPin` through SpreadlineComponent

**Files:**
- Modify: `src/features/spreadlines/components/spreadline.component.tsx`

**Step 1: Add prop to interface**

Add to `Props` interface:

```typescript
onEntityPin?: (name: string | null) => void;
```

**Step 2: Destructure and pass through**

Add `onEntityPin` to destructuring. Pass to `SpreadLineChart`:

```tsx
<SpreadLineChart
  ...existing props...
  onEntityPin={onEntityPin}
/>
```

**Step 3: Commit**

```
feat: wire onEntityPin through SpreadlineComponent
```

---

### Task 4: Manage pinned entity state in SpreadlineTabComponent

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-tab.component.tsx`

**Step 1: Add state**

```typescript
const [pinnedEntityName, setPinnedEntityName] = useState<string | null>(null);
```

**Step 2: Pass to components**

Pass `onEntityPin={setPinnedEntityName}` to `SpreadlineComponent`.
Pass `pinnedEntityName={pinnedEntityName}` to `SpreadlineGraphComponent`.

```tsx
<SpreadlineGraphComponent selectedTimes={selectedTimes} pinnedEntityName={pinnedEntityName} />
...
<SpreadlineComponent
  ...existing props...
  onEntityPin={setPinnedEntityName}
/>
```

**Step 3: Commit**

```
feat: manage pinnedEntityName state in SpreadlineTabComponent
```

---

### Task 5: Highlight path in SpreadlineGraphComponent

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx`

**Step 1: Add prop**

Update `Props` interface:

```typescript
interface Props {
  selectedTimes?: string[];
  pinnedEntityName?: string | null;
}
```

Destructure: `const SpreadlineGraphComponent = ({ selectedTimes = [], pinnedEntityName }: Props) => {`

**Step 2: Add BFS helper function (outside component)**

```typescript
/** BFS: find shortest path of node IDs from ego to target */
const findPath = (
  egoId: string,
  targetId: string,
  links: SpreadlineGraphLink[]
): string[] | null => {
  const adj = new Map<string, string[]>();
  for (const link of links) {
    const s = typeof link.source === 'string' ? link.source : link.source.id;
    const t = typeof link.target === 'string' ? link.target : link.target.id;
    if (!adj.has(s)) adj.set(s, []);
    if (!adj.has(t)) adj.set(t, []);
    adj.get(s)!.push(t);
    adj.get(t)!.push(s);
  }
  const visited = new Set<string>([egoId]);
  const parent = new Map<string, string>();
  const queue = [egoId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetId) {
      const path: string[] = [];
      let node: string | undefined = targetId;
      while (node !== undefined) {
        path.unshift(node);
        node = parent.get(node);
      }
      return path;
    }
    for (const neighbor of adj.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }
  return null;
};
```

**Step 3: Add highlight effect**

Add a new `useEffect` after the time-change effect that reacts to `pinnedEntityName`. This effect uses D3 to directly style existing SVG elements (no re-render):

```typescript
// ═══════════════════════════════════════════════════════════════════════
// Pin Highlight Effect — styles path from ego to pinned entity
// ═══════════════════════════════════════════════════════════════════════
useEffect(() => {
  if (!gRef.current || !rawData) return;
  const g = gRef.current;
  const nodes = nodesRef.current;
  const egoId = rawData.egoId;

  // Reset all nodes and links to default style
  g.select('.nodes').selectAll<SVGGElement, SpreadlineGraphNode>('g').each(function (d) {
    const node = d3.select(this);
    const radius = d.isEgo ? GRAPH_CONFIG.nodeRadius * EGO_SCALE : GRAPH_CONFIG.nodeRadius;
    const iconSize = d.isEgo ? GRAPH_CONFIG.iconSize * EGO_SCALE : GRAPH_CONFIG.iconSize;
    node.select('rect')
      .attr('x', -radius).attr('y', -radius)
      .attr('width', radius * 2).attr('height', radius * 2)
      .attr('fill', getNodeFill(d))
      .attr('stroke-width', d.isEgo ? 3 : GRAPH_CONFIG.linkStrokeWidth)
      .attr('filter', d.isEgo ? 'url(#sl-ego-glow)' : null);
    node.select('use')
      .attr('x', -iconSize / 2).attr('y', -iconSize / 2)
      .attr('width', iconSize).attr('height', iconSize);
    node.select('text')
      .attr('dy', radius + GRAPH_CONFIG.labelOffsetY)
      .attr('font-size', d.isEgo ? '14px' : '12px')
      .attr('font-weight', d.isEgo ? '600' : 'normal');
  });
  g.select('.links').selectAll<SVGLineElement, SpreadlineGraphLink>('line')
    .attr('stroke', GRAPH_CONFIG.linkStroke)
    .attr('stroke-width', GRAPH_CONFIG.linkStrokeWidth)
    .attr('stroke-opacity', GRAPH_CONFIG.linkStrokeOpacity);

  if (!pinnedEntityName) return;

  // Find target node by name
  const targetNode = nodes.find(n => n.name === pinnedEntityName);
  if (!targetNode) return;

  // BFS for shortest path
  // Build links from current DOM data
  const currentLinks: SpreadlineGraphLink[] = [];
  g.select('.links').selectAll<SVGLineElement, SpreadlineGraphLink>('line').each(function (d) {
    currentLinks.push(d);
  });
  const path = findPath(egoId, targetNode.id, currentLinks);
  if (!path) return;

  // Build set of path link keys for quick lookup
  const pathLinkKeys = new Set<string>();
  for (let i = 0; i < path.length - 1; i++) {
    pathLinkKeys.add([path[i], path[i + 1]].sort().join('::'));
  }

  // Highlight path links
  g.select('.links').selectAll<SVGLineElement, SpreadlineGraphLink>('line').each(function (d) {
    const s = typeof d.source === 'string' ? d.source : d.source.id;
    const t = typeof d.target === 'string' ? d.target : d.target.id;
    const key = [s, t].sort().join('::');
    if (pathLinkKeys.has(key)) {
      d3.select(this)
        .attr('stroke', 'var(--primary)')
        .attr('stroke-width', GRAPH_CONFIG.linkStrokeWidth * 2)
        .attr('stroke-opacity', 1);
    }
  });

  // Style target node like ego
  const egoRadius = GRAPH_CONFIG.nodeRadius * EGO_SCALE;
  const egoIconSize = GRAPH_CONFIG.iconSize * EGO_SCALE;
  g.select('.nodes').selectAll<SVGGElement, SpreadlineGraphNode>('g')
    .filter(d => d.id === targetNode.id)
    .each(function () {
      const node = d3.select(this);
      node.select('rect')
        .transition().duration(GRAPH_TIME_TRANSITION_MS)
        .attr('x', -egoRadius).attr('y', -egoRadius)
        .attr('width', egoRadius * 2).attr('height', egoRadius * 2)
        .attr('fill', EGO_NODE_COLOR)
        .attr('stroke-width', 3)
        .attr('filter', 'url(#sl-ego-glow)');
      node.select('use')
        .transition().duration(GRAPH_TIME_TRANSITION_MS)
        .attr('x', -egoIconSize / 2).attr('y', -egoIconSize / 2)
        .attr('width', egoIconSize).attr('height', egoIconSize);
      node.select('text')
        .transition().duration(GRAPH_TIME_TRANSITION_MS)
        .attr('dy', egoRadius + GRAPH_CONFIG.labelOffsetY)
        .attr('font-size', '14px')
        .attr('font-weight', '600');
    });
}, [pinnedEntityName, rawData]);
```

Key details:
- Resets ALL nodes/links to default first (handles unpin and switching pins)
- Uses `var(--primary)` for link stroke (CSS variable, works with `.attr()` on line elements since stroke is a presentation attribute that D3 sets via style)... Actually, use `.style('stroke', 'var(--primary)')` for CSS variable support on SVG, same pattern as the storyline fix.
- Target node gets ego dimensions via smooth transition
- Path links doubled in width and full opacity

**Step 4: Commit**

```
feat: highlight ego→entity path in graph when entity pinned
```

---

## Execution Notes

- The spreadline chart uses entity **names** (e.g., "Maneesh Agrawala"), the graph uses entity **IDs** (e.g., "p1234"). Match by `name` property on graph nodes.
- Use `.style()` not `.attr()` for CSS variables (`var(--primary)`) on SVG elements.
- The highlight effect is a separate `useEffect` that doesn't interfere with the existing time-change data join effect.
- Reset logic ensures clean transitions when switching pinned entities or unpinning.
