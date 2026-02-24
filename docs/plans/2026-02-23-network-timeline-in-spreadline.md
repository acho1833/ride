# Network Timeline Tab in Spreadline — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Network Timeline" tab to the spreadline `.sl` bottom panel so users can compare the same dataset as horizontal dot-and-line timelines alongside the storyline view.

**Architecture:** Both tabs share all state (selectedRange, pins, filters, pagination). The tab bar switches which chart renders in the bottom panel. The force graph on top is unchanged — it receives shared state props. A new `transformSpreadlineToTimeline()` utility produces timeline row data from the same raw API response.

**Tech Stack:** React, D3.js, Shadcn Tabs, TypeScript, Jest

---

### Task 1: Add Constants and Types

**Files:**
- Modify: `src/features/spreadlines/const.ts`

**Step 1: Add network timeline constants and bottom tab type**

Add to the end of `src/features/spreadlines/const.ts`:

```typescript
// ── Network Timeline Constants ────────────────────────────────────

/** Bottom tab type for switching between spreadline and network timeline */
export type SpreadlineBottomTab = 'spreadline' | 'network-timeline';

/** Height of each entity row in the network timeline chart (px) */
export const NETWORK_TIMELINE_ROW_HEIGHT = 32;

/** Radius of dots at each time block (px) */
export const NETWORK_TIMELINE_DOT_RADIUS = 5;

/** Stroke width of lines connecting consecutive time blocks (px) */
export const NETWORK_TIMELINE_LINE_WIDTH = 3;

/** Width of the entity name label column (px) */
export const NETWORK_TIMELINE_LABEL_WIDTH = 120;

/** Padding around the chart area */
export const NETWORK_TIMELINE_PADDING = { top: 30, right: 20, bottom: 10, left: 130 };
```

**Step 2: Commit**

```bash
git add src/features/spreadlines/const.ts
git commit -m "feat(spreadline): add network timeline constants and bottom tab type"
```

---

### Task 2: Add Transform Function (TDD)

**Files:**
- Modify: `src/features/spreadlines/utils.ts`
- Modify: `src/features/spreadlines/utils.test.ts`

**Step 1: Write the failing tests**

Add to `src/features/spreadlines/utils.test.ts`:

```typescript
import { transformSpreadlineToTimeline } from './utils';

// Add `citations` to the existing `makeRawData` — extend the entities:
const makeRawDataWithCitations = () => ({
  egoId: 'ego',
  egoName: 'Ego Author',
  entities: {
    a1: { name: 'Author A', category: 'internal', citations: { '2020': 100, '2021': 200 } },
    a2: { name: 'Author B', category: 'external', citations: { '2020': 50 } }
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
  },
  timeBlocks: ['2021', '2020']
});

describe('transformSpreadlineToTimeline', () => {
  it('returns ego entity first regardless of activity count', () => {
    const result = transformSpreadlineToTimeline(makeRawDataWithCitations());
    expect(result[0].name).toBe('Ego Author');
    expect(result[0].isEgo).toBe(true);
  });

  it('sorts non-ego entities by total activity count descending', () => {
    const result = transformSpreadlineToTimeline(makeRawDataWithCitations());
    const nonEgo = result.filter(e => !e.isEgo);
    expect(nonEgo[0].name).toBe('Author A');
    expect(nonEgo[1].name).toBe('Author B');
    expect(nonEgo[0].totalActivity).toBeGreaterThanOrEqual(nonEgo[1].totalActivity);
  });

  it('computes timeBlocks with citation counts per entity', () => {
    const result = transformSpreadlineToTimeline(makeRawDataWithCitations());
    const a1 = result.find(e => e.name === 'Author A')!;
    expect(a1.timeBlocks).toEqual(
      expect.arrayContaining([
        { time: '2020', citationCount: 100 },
        { time: '2021', citationCount: 200 }
      ])
    );
  });

  it('computes lifespan as number of distinct active time blocks', () => {
    const result = transformSpreadlineToTimeline(makeRawDataWithCitations());
    const a1 = result.find(e => e.name === 'Author A')!;
    expect(a1.lifespan).toBe(2);
    const a2 = result.find(e => e.name === 'Author B')!;
    expect(a2.lifespan).toBe(2); // appears in 2020 and 2021 topology
  });

  it('includes ego time blocks from topology', () => {
    const result = transformSpreadlineToTimeline(makeRawDataWithCitations());
    const ego = result.find(e => e.isEgo)!;
    expect(ego.timeBlocks.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=utils.test.ts`
Expected: FAIL — `transformSpreadlineToTimeline` is not exported

**Step 3: Write the implementation**

Add to `src/features/spreadlines/utils.ts`:

```typescript
/** Timeline entity for the network timeline chart */
export interface TimelineEntity {
  id: string;
  name: string;
  isEgo: boolean;
  totalActivity: number;
  lifespan: number;
  timeBlocks: Array<{
    time: string;
    citationCount: number;
  }>;
}

/**
 * Transform spreadline raw data into timeline entities.
 *
 * Each entity gets a row with time blocks where it has relations,
 * plus citation counts per block. Sorted by total activity (ego first).
 */
export function transformSpreadlineToTimeline(rawData: {
  egoId: string;
  egoName: string;
  entities: Record<string, { name: string; citations: Record<string, number> }>;
  topology: { sourceId: string; targetId: string; time: string; weight: number }[];
}): TimelineEntity[] {
  // 1. Collect active time blocks per entity from topology
  const entityTimes = new Map<string, Set<string>>();
  for (const entry of rawData.topology) {
    if (!entityTimes.has(entry.sourceId)) entityTimes.set(entry.sourceId, new Set());
    if (!entityTimes.has(entry.targetId)) entityTimes.set(entry.targetId, new Set());
    entityTimes.get(entry.sourceId)!.add(entry.time);
    entityTimes.get(entry.targetId)!.add(entry.time);
  }

  // 2. Build timeline entities
  const results: TimelineEntity[] = [];

  // Ego entity
  const egoTimes = entityTimes.get(rawData.egoId) ?? new Set<string>();
  results.push({
    id: rawData.egoId,
    name: rawData.egoName,
    isEgo: true,
    totalActivity: egoTimes.size,
    lifespan: egoTimes.size,
    timeBlocks: Array.from(egoTimes)
      .sort()
      .map(time => ({ time, citationCount: 0 }))
  });

  // Non-ego entities
  for (const [id, entity] of Object.entries(rawData.entities)) {
    const times = entityTimes.get(id) ?? new Set<string>();
    const timeBlocks = Array.from(times)
      .sort()
      .map(time => ({
        time,
        citationCount: entity.citations[time] ?? 0
      }));

    results.push({
      id,
      name: entity.name,
      isEgo: false,
      totalActivity: times.size,
      lifespan: times.size,
      timeBlocks
    });
  }

  // 3. Sort: ego first, then by totalActivity descending
  results.sort((a, b) => {
    if (a.isEgo) return -1;
    if (b.isEgo) return 1;
    return b.totalActivity - a.totalActivity;
  });

  return results;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=utils.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/features/spreadlines/utils.ts src/features/spreadlines/utils.test.ts
git commit -m "feat(spreadline): add transformSpreadlineToTimeline utility with tests"
```

---

### Task 3: Create Bottom Tab Bar Component

**Files:**
- Create: `src/features/spreadlines/components/spreadline-bottom-tabs.component.tsx`

**Step 1: Create the tab bar component**

This is a minimal tab switcher using simple buttons (Shadcn-styled). It renders at the top of the bottom panel.

```typescript
'use client';

import type { SpreadlineBottomTab } from '@/features/spreadlines/const';

interface Props {
  activeTab: SpreadlineBottomTab;
  onTabChange: (tab: SpreadlineBottomTab) => void;
}

const SpreadlineBottomTabsComponent = ({ activeTab, onTabChange }: Props) => {
  return (
    <div className="border-border bg-background flex shrink-0 items-center gap-0 border-b text-xs">
      <button
        className={`px-3 py-1.5 font-medium transition-colors ${
          activeTab === 'spreadline'
            ? 'text-primary border-primary border-b-2'
            : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
        }`}
        onClick={() => onTabChange('spreadline')}
      >
        Spreadline
      </button>
      <button
        className={`px-3 py-1.5 font-medium transition-colors ${
          activeTab === 'network-timeline'
            ? 'text-primary border-primary border-b-2'
            : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
        }`}
        onClick={() => onTabChange('network-timeline')}
      >
        Network Timeline
      </button>
    </div>
  );
};

export default SpreadlineBottomTabsComponent;
```

**Step 2: Commit**

```bash
git add src/features/spreadlines/components/spreadline-bottom-tabs.component.tsx
git commit -m "feat(spreadline): add bottom panel tab bar component"
```

---

### Task 4: Create Network Timeline Chart Component

**Files:**
- Create: `src/features/spreadlines/components/network-timeline-chart.component.tsx`

This is the main new component. It renders:
1. A toolbar (simplified version of spreadline's toolbar)
2. A D3 SVG chart with horizontal timeline rows per entity
3. Floating zoom/pagination controls

**Step 1: Create the component**

```typescript
'use client';

/**
 * Network Timeline Chart Component
 *
 * Horizontal dot-and-line timelines per entity, sorted by activity count.
 * Uses the same spreadline raw data but renders as simple timeline rows.
 * Colored by citation frequency heatmap (same scale as spreadline).
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { Minus, Plus, Maximize, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SPREADLINE_FREQUENCY_COLORS,
  SPREADLINE_FREQUENCY_THRESHOLDS,
  SPREADLINE_RELATION_TYPE_OPTIONS,
  SPREADLINE_GRANULARITY_OPTIONS,
  NETWORK_TIMELINE_ROW_HEIGHT,
  NETWORK_TIMELINE_DOT_RADIUS,
  NETWORK_TIMELINE_LINE_WIDTH,
  NETWORK_TIMELINE_PADDING,
  type SpreadlineGranularity
} from '@/features/spreadlines/const';
import { transformSpreadlineToTimeline } from '@/features/spreadlines/utils';
import type { SpreadlineRawData } from './spreadline.component';

interface Props {
  rawData: SpreadlineRawData | null;
  timeBlocks: string[];
  pinnedEntityNames: string[];
  relationTypes: string[];
  onRelationTypesChange: (types: string[]) => void;
  granularity: SpreadlineGranularity;
  onGranularityChange: (granularity: SpreadlineGranularity) => void;
  pageIndex: number;
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
  blocksFilter: number;
  onBlocksFilterChange: (value: number) => void;
  onFilteredEntityNamesChange?: (names: string[]) => void;
  onEntityPin?: (names: string[]) => void;
}
```

The component body:
- Computes timeline entities using `transformSpreadlineToTimeline(rawData)`
- Filters by `blocksFilter` (entities with `lifespan >= blocksFilter`, ego always included)
- Reports `filteredEntityNames` to parent
- Renders toolbar with: stats, frequency legend, blocks filter slider, relation type, granularity, clear pins
- Renders D3 SVG:
  - X-axis: time blocks (band scale)
  - Y-axis: entity names (band scale, sorted by activity)
  - For each entity row: dots at active time blocks, lines between consecutive blocks
  - Dots/lines colored by starting block's citation count using `d3.scaleThreshold` with `SPREADLINE_FREQUENCY_THRESHOLDS` / `SPREADLINE_FREQUENCY_COLORS`
  - Entity name labels on left side, clickable (toggles pin)
  - Pinned entity names styled with `var(--primary)` color
- Floating controls: pagination + zoom

Full implementation in file. Key D3 rendering logic:

```typescript
// Color scale (same as spreadline frequency heatmap)
const colorScale = d3.scaleThreshold<number, string>()
  .domain(SPREADLINE_FREQUENCY_THRESHOLDS)
  .range(SPREADLINE_FREQUENCY_COLORS);

// For each entity row:
filteredEntities.forEach((entity, i) => {
  const y = yScale(entity.name)! + yScale.bandwidth() / 2;
  const isPinned = pinnedEntityNames.includes(entity.name);

  // Name label (clickable)
  g.append('text')
    .attr('x', NETWORK_TIMELINE_PADDING.left - 10)
    .attr('y', y)
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .attr('fill', isPinned ? 'var(--primary)' : entity.isEgo ? 'hsl(210, 70%, 50%)' : 'currentColor')
    .attr('font-size', '11px')
    .attr('font-weight', entity.isEgo ? 'bold' : 'normal')
    .attr('cursor', 'pointer')
    .text(entity.name)
    .on('click', () => handleEntityClick(entity.name));

  // Lines between consecutive time blocks
  for (let j = 0; j < entity.timeBlocks.length - 1; j++) {
    const tb1 = entity.timeBlocks[j];
    const tb2 = entity.timeBlocks[j + 1];
    const x1 = xScale(tb1.time)! + xScale.bandwidth() / 2;
    const x2 = xScale(tb2.time)! + xScale.bandwidth() / 2;
    // Only connect consecutive blocks
    const idx1 = timeBlocks.indexOf(tb1.time);
    const idx2 = timeBlocks.indexOf(tb2.time);
    if (Math.abs(idx2 - idx1) === 1) {
      g.append('line')
        .attr('x1', x1).attr('x2', x2)
        .attr('y1', y).attr('y2', y)
        .attr('stroke', colorScale(tb1.citationCount))
        .attr('stroke-width', NETWORK_TIMELINE_LINE_WIDTH)
        .attr('stroke-opacity', 0.8);
    }
  }

  // Dots at each active time block
  entity.timeBlocks.forEach(tb => {
    g.append('circle')
      .attr('cx', xScale(tb.time)! + xScale.bandwidth() / 2)
      .attr('cy', y)
      .attr('r', NETWORK_TIMELINE_DOT_RADIUS)
      .attr('fill', colorScale(tb.citationCount));
  });
});
```

**Step 2: Verify it compiles**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/spreadlines/components/network-timeline-chart.component.tsx
git commit -m "feat(spreadline): add network timeline chart D3 component"
```

---

### Task 5: Wire Up Tab Switching in SpreadlineTabComponent

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-tab.component.tsx`

**Step 1: Add tab state and imports**

Add import for the new components and type:

```typescript
import { type SpreadlineBottomTab } from '@/features/spreadlines/const';
import SpreadlineBottomTabsComponent from './spreadline-bottom-tabs.component';
import NetworkTimelineChartComponent from './network-timeline-chart.component';
```

Add state:

```typescript
const [activeBottomTab, setActiveBottomTab] = useState<SpreadlineBottomTab>('spreadline');
```

**Step 2: Update the bottom panel render**

Replace the current bottom `<ResizablePanel>` content. Currently it is:

```tsx
<ResizablePanel defaultSize={50} minSize={20}>
  <div className="h-full w-full overflow-hidden">
    <SpreadlineComponent ... />
  </div>
</ResizablePanel>
```

Change to:

```tsx
<ResizablePanel defaultSize={50} minSize={20}>
  <div className="flex h-full w-full flex-col overflow-hidden">
    <SpreadlineBottomTabsComponent activeTab={activeBottomTab} onTabChange={setActiveBottomTab} />
    <div className="min-h-0 flex-1">
      {activeBottomTab === 'spreadline' ? (
        <SpreadlineComponent
          rawData={rawData ?? null}
          highlightTimes={selectedTimes}
          pinnedEntityNames={pinnedEntityNames}
          relationTypes={relationTypes}
          onRelationTypesChange={setRelationTypes}
          onTimeClick={handleTimeClick}
          onHighlightRangeChange={handleHighlightRangeChange}
          onEntityPin={setPinnedEntityNames}
          granularity={granularity}
          onGranularityChange={handleGranularityChange}
          splitByAffiliation={splitByAffiliation}
          onSplitByAffiliationChange={setSplitByAffiliation}
          pageIndex={pageIndex}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          blocksFilter={blocksFilter}
          onBlocksFilterChange={setBlocksFilter}
          onFilteredEntityNamesChange={setFilteredEntityNames}
        />
      ) : (
        <NetworkTimelineChartComponent
          rawData={rawData ?? null}
          timeBlocks={timeBlocks}
          pinnedEntityNames={pinnedEntityNames}
          relationTypes={relationTypes}
          onRelationTypesChange={setRelationTypes}
          granularity={granularity}
          onGranularityChange={handleGranularityChange}
          pageIndex={pageIndex}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          blocksFilter={blocksFilter}
          onBlocksFilterChange={setBlocksFilter}
          onFilteredEntityNamesChange={setFilteredEntityNames}
          onEntityPin={setPinnedEntityNames}
        />
      )}
    </div>
  </div>
</ResizablePanel>
```

**Step 3: Verify it builds**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Verify it works visually**

Open a `.sl` file in the UI. The bottom panel should show:
- A tab bar with "Spreadline" and "Network Timeline" tabs
- Spreadline tab shows the existing chart (unchanged)
- Network Timeline tab shows horizontal timeline rows
- Switching tabs preserves the same data/filters
- Pinning entities in either tab highlights path in the graph

**Step 5: Run all tests**

Run: `npm test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/features/spreadlines/components/spreadline-tab.component.tsx
git commit -m "feat(spreadline): wire up bottom panel tab switching for network timeline"
```

---

### Task 6: Final Verification and Lint

**Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Run tests**

Run: `npm test`
Expected: ALL PASS

**Step 4: Fix any issues found**

If lint/build/test issues found, fix them and commit.

---

## Review Checklist

After implementation, verify:
- [ ] Tab bar renders at top of bottom panel
- [ ] Switching tabs shows the correct chart
- [ ] Network timeline rows sorted by activity (ego first)
- [ ] Dots colored by citation frequency heatmap
- [ ] Lines connect consecutive time blocks, colored by starting block's citation count
- [ ] Clicking entity name toggles pin, highlights path in graph
- [ ] Blocks filter slider filters rows in both tabs
- [ ] Pagination works in both tabs
- [ ] Relation type and granularity dropdowns work in both tabs
- [ ] Clear pins button works in network timeline tab
- [ ] No changes to spreadline-graph.component.tsx
- [ ] No changes to spreadline.component.tsx
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Lint passes
