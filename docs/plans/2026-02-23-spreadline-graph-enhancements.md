# Spreadline Force Graph Enhancements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the force-directed graph to show citation-weighted link colors/thickness/labels and add hover tooltips for nodes and links.

**Architecture:** Extend the existing graph data transform functions to carry citation metadata on links and nodes. Add D3 threshold scales in the graph component for color/width mapping. Add SVG label groups and HTML tooltip div for interactivity.

**Tech Stack:** D3.js, React, TypeScript, Tailwind CSS variables

---

## Task 1: Add New Constants

**Files:**
- Modify: `src/features/spreadlines/const.ts:98-116` (after hop-aware graph section)

**Step 1: Add link width bands and label threshold constants**

Add after line 116 (`GRAPH_TIME_TRANSITION_MS`):

```typescript
/** Fixed link stroke widths per citation-count band (matches SPREADLINE_FREQUENCY_THRESHOLDS) */
export const GRAPH_LINK_WIDTH_BANDS = [1, 2, 3, 4, 6];

/** Minimum citation count to show a label on a link */
export const GRAPH_LINK_LABEL_MIN_THRESHOLD = 10;
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/spreadlines/const.ts
git commit -m "feat(spreadline): add link width bands and label threshold constants"
```

---

## Task 2: Extend Graph Interfaces

**Files:**
- Modify: `src/features/spreadlines/utils.ts:9-29` (interfaces)

**Step 1: Add `totalCitations` to `SpreadlineGraphNode`**

Add `totalCitations: number;` to the interface, after `collaborationCount`:

```typescript
export interface SpreadlineGraphNode extends SimulationNodeDatum {
  id: string;
  name: string;
  isEgo: boolean;
  collaborationCount: number;
  /** Sum of citation weights across all links involving this node */
  totalCitations: number;
  /** Hop distance from ego: 0 = ego, 1 = direct, 2 = indirect */
  hopDistance?: 0 | 1 | 2;
  /** Entity category: internal (same affiliation) or external */
  category?: 'internal' | 'external' | 'ego';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}
```

**Step 2: Add `weight`, `paperCount`, `years` to `SpreadlineGraphLink`**

```typescript
export interface SpreadlineGraphLink extends SimulationLinkDatum<SpreadlineGraphNode> {
  source: string | SpreadlineGraphNode;
  target: string | SpreadlineGraphNode;
  /** Aggregated citation count across all co-authored papers */
  weight: number;
  /** Number of distinct co-authored papers */
  paperCount: number;
  /** Years in which the collaboration occurred */
  years: string[];
}
```

**Step 3: Verify build — expect errors in transform functions and component**

Run: `npx tsc --noEmit`
Expected: Type errors in transform functions (missing new fields). This is correct — we fix in next tasks.

---

## Task 3: Write Tests for Transform Functions

**Files:**
- Create: `src/features/spreadlines/utils.test.ts`

**Step 1: Write tests for link aggregation and node totalCitations**

```typescript
import { transformSpreadlineToGraph, transformSpreadlineToGraphByTime, transformSpreadlineToGraphByTimes } from './utils';

const makeRawData = () => ({
  egoId: 'ego',
  egoName: 'Ego Author',
  entities: {
    a1: { name: 'Author A', category: 'internal' },
    a2: { name: 'Author B', category: 'external' }
  },
  topology: [
    { sourceId: 'ego', targetId: 'a1', time: '2020', weight: 100 },
    { sourceId: 'ego', targetId: 'a1', time: '2021', weight: 200 },
    { sourceId: 'ego', targetId: 'a2', time: '2020', weight: 50 },
    { sourceId: 'a1', targetId: 'a2', time: '2021', weight: 300 }
  ],
  groups: {
    '2020': [[], [], ['ego'], ['a1'], ['a2']],
    '2021': [[], [], ['ego'], ['a1'], ['a2']]
  }
});

describe('transformSpreadlineToGraph', () => {
  it('aggregates link weight across all topology entries', () => {
    const { links } = transformSpreadlineToGraph(makeRawData());
    const egoA1 = links.find(
      l => [l.source, l.target].sort().join('::') === 'a1::ego'
    );
    expect(egoA1).toBeDefined();
    expect(egoA1!.weight).toBe(300); // 100 + 200
    expect(egoA1!.paperCount).toBe(2);
    expect(egoA1!.years).toEqual(expect.arrayContaining(['2020', '2021']));
  });

  it('computes totalCitations per node', () => {
    const { nodes } = transformSpreadlineToGraph(makeRawData());
    const a1 = nodes.find(n => n.id === 'a1');
    // a1 links: ego-a1 (100+200=300) + a1-a2 (300) = 600
    expect(a1!.totalCitations).toBe(600);
  });

  it('sets ego totalCitations to 0', () => {
    const { nodes } = transformSpreadlineToGraph(makeRawData());
    const ego = nodes.find(n => n.isEgo);
    expect(ego!.totalCitations).toBe(0);
  });
});

describe('transformSpreadlineToGraphByTime', () => {
  it('aggregates link weight for a single time block', () => {
    const { links } = transformSpreadlineToGraphByTime(makeRawData(), '2020');
    const egoA1 = links.find(
      l => [l.source, l.target].sort().join('::') === 'a1::ego'
    );
    expect(egoA1!.weight).toBe(100);
    expect(egoA1!.paperCount).toBe(1);
    expect(egoA1!.years).toEqual(['2020']);
  });
});

describe('transformSpreadlineToGraphByTimes', () => {
  it('aggregates link weight across time range', () => {
    const { links } = transformSpreadlineToGraphByTimes(makeRawData(), ['2020', '2021']);
    const egoA1 = links.find(
      l => [l.source, l.target].sort().join('::') === 'a1::ego'
    );
    expect(egoA1!.weight).toBe(300);
    expect(egoA1!.paperCount).toBe(2);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=spreadlines/utils.test --no-coverage`
Expected: FAIL — transform functions don't return the new fields yet

---

## Task 4: Update `transformSpreadlineToGraph`

**Files:**
- Modify: `src/features/spreadlines/utils.ts:38-86`

**Step 1: Widen topology type and aggregate link data**

Replace the function body. Key changes:
1. Topology type gains `time: string` and `weight: number`
2. Use a `Map<string, { weight, paperCount, years }>` instead of a `Set<string>` for link dedup
3. Compute `totalCitations` per node from aggregated link weights

```typescript
export function transformSpreadlineToGraph(rawData: {
  egoId: string;
  egoName: string;
  entities: Record<string, { name: string }>;
  topology: { sourceId: string; targetId: string; time: string; weight: number }[];
}): { nodes: SpreadlineGraphNode[]; links: SpreadlineGraphLink[] } {
  // Count collaborations per entity
  const collabCounts = new Map<string, number>();
  // Aggregate link data: key -> { weight, paperCount, years }
  const linkMap = new Map<string, { source: string; target: string; weight: number; paperCount: number; years: Set<string> }>();

  for (const entry of rawData.topology) {
    collabCounts.set(entry.sourceId, (collabCounts.get(entry.sourceId) ?? 0) + 1);
    collabCounts.set(entry.targetId, (collabCounts.get(entry.targetId) ?? 0) + 1);

    const key = [entry.sourceId, entry.targetId].sort().join('::');
    const existing = linkMap.get(key);
    if (existing) {
      existing.weight += entry.weight;
      existing.paperCount += 1;
      existing.years.add(entry.time);
    } else {
      const [source, target] = key.split('::');
      linkMap.set(key, { source, target, weight: entry.weight, paperCount: 1, years: new Set([entry.time]) });
    }
  }

  // Compute totalCitations per node from link aggregates
  const nodeCitations = new Map<string, number>();
  for (const link of linkMap.values()) {
    nodeCitations.set(link.source, (nodeCitations.get(link.source) ?? 0) + link.weight);
    nodeCitations.set(link.target, (nodeCitations.get(link.target) ?? 0) + link.weight);
  }

  const egoNode: SpreadlineGraphNode = {
    id: rawData.egoId,
    name: rawData.egoName,
    isEgo: true,
    collaborationCount: 0,
    totalCitations: 0
  };

  const entityNodes: SpreadlineGraphNode[] = Object.entries(rawData.entities).map(([id, entity]) => ({
    id,
    name: entity.name,
    isEgo: false,
    collaborationCount: collabCounts.get(id) ?? 0,
    totalCitations: nodeCitations.get(id) ?? 0
  }));

  const nodes = [egoNode, ...entityNodes];
  const nodeIds = new Set(nodes.map(n => n.id));

  const links: SpreadlineGraphLink[] = Array.from(linkMap.values())
    .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
    .map(l => ({ source: l.source, target: l.target, weight: l.weight, paperCount: l.paperCount, years: Array.from(l.years).sort() }));

  return { nodes, links };
}
```

**Step 2: Run tests**

Run: `npm test -- --testPathPattern=spreadlines/utils.test --no-coverage`
Expected: `transformSpreadlineToGraph` tests PASS, others still FAIL

---

## Task 5: Update `transformSpreadlineToGraphByTime`

**Files:**
- Modify: `src/features/spreadlines/utils.ts` (the `transformSpreadlineToGraphByTime` function)

**Step 1: Aggregate link data in the single-time function**

Replace the link-building section (step 5 in the function). Key change: use a `Map` instead of `Set` to aggregate weight/paperCount/years. Also add `totalCitations: 0` to ego node and compute `totalCitations` for entity nodes.

Replace from `// 5. Build links` to end of function:

```typescript
  // 5. Build links (deduplicated within this time block, with aggregation)
  const linkMap = new Map<string, { source: string; target: string; weight: number; paperCount: number; years: Set<string> }>();
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const entry of timeTopology) {
    if (!nodeIds.has(entry.sourceId) || !nodeIds.has(entry.targetId)) continue;
    const key = [entry.sourceId, entry.targetId].sort().join('::');
    const existing = linkMap.get(key);
    if (existing) {
      existing.weight += entry.weight;
      existing.paperCount += 1;
      existing.years.add(entry.time);
    } else {
      const [source, target] = key.split('::');
      linkMap.set(key, { source, target, weight: entry.weight, paperCount: 1, years: new Set([entry.time]) });
    }
  }

  // Compute totalCitations per node
  const nodeCitations = new Map<string, number>();
  for (const link of linkMap.values()) {
    nodeCitations.set(link.source, (nodeCitations.get(link.source) ?? 0) + link.weight);
    nodeCitations.set(link.target, (nodeCitations.get(link.target) ?? 0) + link.weight);
  }
  for (const node of nodes) {
    node.totalCitations = node.isEgo ? 0 : (nodeCitations.get(node.id) ?? 0);
  }

  const links: SpreadlineGraphLink[] = Array.from(linkMap.values())
    .map(l => ({ source: l.source, target: l.target, weight: l.weight, paperCount: l.paperCount, years: Array.from(l.years).sort() }));

  return { nodes, links };
```

Also add `totalCitations: 0` to both the ego node and entity nodes when they're created (steps 4a and 4b in the function).

**Step 2: Run tests**

Run: `npm test -- --testPathPattern=spreadlines/utils.test --no-coverage`
Expected: `transformSpreadlineToGraphByTime` tests PASS

---

## Task 6: Update `transformSpreadlineToGraphByTimes`

**Files:**
- Modify: `src/features/spreadlines/utils.ts` (the `transformSpreadlineToGraphByTimes` function)

**Step 1: Same aggregation pattern for multi-time**

Replace the link-building section. Same pattern as Task 5 — `Map` instead of `Set`, aggregate weight/paperCount/years. Add `totalCitations: 0` to ego and entity nodes, then compute after links are built.

**Step 2: Run all tests**

Run: `npm test -- --testPathPattern=spreadlines/utils.test --no-coverage`
Expected: ALL PASS

**Step 3: Verify full build**

Run: `npx tsc --noEmit`
Expected: Errors only in `spreadline-graph.component.tsx` (component not yet updated)

**Step 4: Commit**

```bash
git add src/features/spreadlines/utils.ts src/features/spreadlines/utils.test.ts
git commit -m "feat(spreadline): add citation metadata to graph links and nodes"
```

---

## Task 7: Add Link Color and Width Scales to Graph Component

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx`

**Step 1: Add imports for new constants**

Add to the existing import from `@/features/spreadlines/const`:
- `SPREADLINE_FREQUENCY_COLORS`
- `SPREADLINE_FREQUENCY_THRESHOLDS`
- `GRAPH_LINK_WIDTH_BANDS`
- `GRAPH_LINK_LABEL_MIN_THRESHOLD`

**Step 2: Create scale helper functions outside the component**

Add after the existing `getNodeIconSize` helper (~line 50):

```typescript
/** D3 threshold scale: citation count → link stroke color */
const linkColorScale = d3
  .scaleThreshold<number, string>()
  .domain(SPREADLINE_FREQUENCY_THRESHOLDS)
  .range(SPREADLINE_FREQUENCY_COLORS);

/** D3 threshold scale: citation count → link stroke width */
const linkWidthScale = d3
  .scaleThreshold<number, number>()
  .domain(SPREADLINE_FREQUENCY_THRESHOLDS)
  .range(GRAPH_LINK_WIDTH_BANDS);

/** Get link stroke color from citation weight */
const getLinkColor = (d: SpreadlineGraphLink): string => linkColorScale(d.weight);

/** Get link stroke width from citation weight */
const getLinkWidth = (d: SpreadlineGraphLink): number => linkWidthScale(d.weight);
```

**Step 3: Replace uniform link styling in Time-Change effect**

In the enter links section (~line 342-347), replace:
```typescript
.attr('stroke', GRAPH_CONFIG.linkStroke)
.attr('stroke-width', GRAPH_CONFIG.linkStrokeWidth)
```
with:
```typescript
.attr('stroke', getLinkColor)
.attr('stroke-width', getLinkWidth)
```

In the returning links section (~line 355-363), add after `.style('display', '')`:
```typescript
.attr('stroke', getLinkColor)
.attr('stroke-width', getLinkWidth)
```

**Step 4: Update Pin Highlight reset**

In the Pin Highlight Effect (~line 634-640), replace the link reset:
```typescript
.attr('stroke', GRAPH_CONFIG.linkStroke)
.attr('stroke-width', GRAPH_CONFIG.linkStrokeWidth)
```
with:
```typescript
.attr('stroke', getLinkColor)
.attr('stroke-width', getLinkWidth)
```

**Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/features/spreadlines/components/spreadline-graph.component.tsx
git commit -m "feat(spreadline): color and size graph links by citation count"
```

---

## Task 8: Add Link Midpoint Labels

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx`

**Step 1: Add `link-labels` group in Main Effect**

After `g.append('g').attr('class', 'nodes');` (~line 242), add:
```typescript
g.append('g').attr('class', 'link-labels');
```

**Step 2: Add label data join in Time-Change effect**

After the link data join and merge, add a label data join for links with weight >= `GRAPH_LINK_LABEL_MIN_THRESHOLD`. Each label is a `<g>` containing a `<rect>` background and `<text>`.

Add after the `linkMerged` merge and before the node data join:

```typescript
    // ─── D3 Data Join: Link Labels ────────────────────────────────────
    const labelLinks = links.filter(l => l.weight >= GRAPH_LINK_LABEL_MIN_THRESHOLD);

    const labelJoin = g
      .select<SVGGElement>('.link-labels')
      .selectAll<SVGGElement, SpreadlineGraphLink>('g')
      .data(labelLinks, (d: SpreadlineGraphLink) => {
        const srcId = typeof d.source === 'string' ? d.source : d.source.id;
        const tgtId = typeof d.target === 'string' ? d.target : d.target.id;
        return [srcId, tgtId].sort().join('::');
      });

    labelJoin.exit().remove();

    const labelEnter = labelJoin
      .enter()
      .append('g')
      .attr('pointer-events', 'none')
      .style('opacity', 0);

    labelEnter
      .append('rect')
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', 'rgba(0, 0, 0, 0.7)')
      .attr('stroke', 'none');

    labelEnter
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', 'white')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .text(d => String(d.weight));

    // Size the background rect to fit the text
    labelEnter.each(function () {
      const group = d3.select(this);
      const textEl = group.select('text').node() as SVGTextElement;
      const bbox = textEl.getBBox();
      group
        .select('rect')
        .attr('x', -bbox.width / 2 - 4)
        .attr('y', -bbox.height / 2 - 2)
        .attr('width', bbox.width + 8)
        .attr('height', bbox.height + 4);
    });

    labelEnter.transition().duration(GRAPH_TIME_TRANSITION_MS).style('opacity', 1);

    const labelMerged = labelEnter.merge(labelJoin);
```

**Step 3: Update label positions on simulation tick**

In both the synchronous first-render position setting and the animated tick handler, add label position updates. After each block that updates link x1/y1/x2/y2 positions, add:

```typescript
labelMerged.attr('transform', d => {
  const s = d.source as SpreadlineGraphNode;
  const t = d.target as SpreadlineGraphNode;
  return `translate(${((s.x ?? 0) + (t.x ?? 0)) / 2},${((s.y ?? 0) + (t.y ?? 0)) / 2})`;
});
```

**Step 4: Update label positions during drag**

In the drag handler's `on('drag')`, after updating connected link positions, also update labels. Add a `nodeLabelMapRef` or compute label positions from the linked data. Simplest approach: store a ref to `labelMerged` and update in tick/drag.

Actually, for drag: labels are positioned by their bound data which references the same node objects. So during drag, after updating `d.x` and `d.y`, the labels referencing those nodes also need updating. Add after the link position updates in the drag handler:

```typescript
// Update link labels during drag
g.select('.link-labels')
  .selectAll<SVGGElement, SpreadlineGraphLink>('g')
  .attr('transform', d => {
    const s = d.source as SpreadlineGraphNode;
    const t = d.target as SpreadlineGraphNode;
    return `translate(${((s.x ?? 0) + (t.x ?? 0)) / 2},${((s.y ?? 0) + (t.y ?? 0)) / 2})`;
  });
```

Note: For the drag handler, `g` is `gRef.current`. Access it inside the drag closure.

**Step 5: Verify build and test visually**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/features/spreadlines/components/spreadline-graph.component.tsx
git commit -m "feat(spreadline): add citation count labels at link midpoints"
```

---

## Task 9: Add Hover Tooltips

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx`

**Step 1: Add tooltip state**

Add a ref for the tooltip div inside the component:

```typescript
const tooltipRef = useRef<HTMLDivElement>(null);
```

**Step 2: Add tooltip div to JSX**

Inside the `<>` fragment, after the SVG and before zoom controls, add:

```tsx
{/* Tooltip */}
<div
  ref={tooltipRef}
  className="bg-popover text-popover-foreground border-border pointer-events-none absolute z-20 hidden rounded-md border px-3 py-2 text-xs shadow-md"
/>
```

**Step 3: Create tooltip show/hide helpers**

Add inside the component (before the effects):

```typescript
const showTooltip = useCallback((event: MouseEvent, html: string) => {
  const tooltip = tooltipRef.current;
  const container = containerRef.current;
  if (!tooltip || !container) return;
  tooltip.innerHTML = html;
  tooltip.style.display = 'block';
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left + 12;
  const y = event.clientY - rect.top - 12;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}, []);

const hideTooltip = useCallback(() => {
  const tooltip = tooltipRef.current;
  if (tooltip) tooltip.style.display = 'none';
}, []);
```

**Step 4: Attach node mouseover/mouseout in Time-Change effect**

After `nodeMerged.call(drag)`, add:

```typescript
nodeMerged
  .on('mouseover', function (event: MouseEvent, d: SpreadlineGraphNode) {
    const collaborators = links.filter(l => {
      const s = typeof l.source === 'string' ? l.source : l.source.id;
      const t = typeof l.target === 'string' ? l.target : l.target.id;
      return s === d.id || t === d.id;
    }).length;
    showTooltip(event, [
      `<div class="font-semibold">${d.name}</div>`,
      `<div class="text-muted-foreground">${d.isEgo ? 'Ego' : d.category === 'internal' ? 'Internal' : 'External'}</div>`,
      `<div>Citations: ${d.totalCitations.toLocaleString()}</div>`,
      `<div>Collaborators: ${collaborators}</div>`
    ].join(''));
  })
  .on('mouseout', hideTooltip);
```

**Step 5: Attach link mouseover/mouseout in Time-Change effect**

After the link enter/merge, add:

```typescript
linkMerged
  .on('mouseover', function (event: MouseEvent, d: SpreadlineGraphLink) {
    const s = d.source as SpreadlineGraphNode;
    const t = d.target as SpreadlineGraphNode;
    showTooltip(event, [
      `<div class="font-semibold">${s.name} — ${t.name}</div>`,
      `<div>Citations: ${d.weight.toLocaleString()}</div>`,
      `<div>Papers: ${d.paperCount}</div>`,
      `<div>Years: ${d.years.join(', ')}</div>`
    ].join(''));
  })
  .on('mouseout', hideTooltip);
```

Note: link `pointer-events` may need to be set to `'visibleStroke'` or links need sufficient stroke width to be hoverable. Add `.style('pointer-events', 'visibleStroke')` to link enter.

**Step 6: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add src/features/spreadlines/components/spreadline-graph.component.tsx
git commit -m "feat(spreadline): add hover tooltips for graph nodes and links"
```

---

## Task 10: Final Verification and Cleanup

**Step 1: Run full test suite**

Run: `npm test -- --no-coverage`
Expected: ALL PASS

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors (fix any that arise)

**Step 3: Run full build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Manual visual verification**

1. Open the app, navigate to a spreadline workspace
2. Verify links are colored by citation bands (white → pink → purple)
3. Verify link thickness varies by citation bands
4. Verify citation count labels appear at midpoints for links with 10+ citations
5. Hover nodes — verify tooltip with name, category, citations, collaborators
6. Hover links — verify tooltip with names, citations, papers, years
7. Pin an entity — verify path highlighting overrides colors, then unpinning restores citation colors
8. Change time selection — verify labels/colors update with new data
9. Drag nodes — verify labels follow

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(spreadline): complete graph link enhancements with tooltips"
```
