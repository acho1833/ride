# Network Timeline Tab in Spreadline — Design Document

**Date:** 2026-02-23
**Status:** Draft

## Overview

Add a "Network Timeline" tab to the spreadline (`.sl`) bottom panel, alongside the existing "Spreadline" tab. Both tabs visualize the **same spreadline dataset** but in different formats:

- **Spreadline tab** — storyline chart (existing, unchanged)
- **Network Timeline tab** — horizontal dot-and-line timelines per entity, sorted by activity count

The goal is to **compare and contrast** the same data in two visual representations.

## Architecture

### Shared State

Both tabs share **all state** — no per-tab state duplication:

- `selectedRange` — scrubber time selection
- `pinnedEntityNames` — clicked entity names (highlights path in graph)
- `blocksFilter` — minimum lifespan filter
- `filteredEntityNames` — derived from blocksFilter
- `relationTypes`, `granularity`, `splitByAffiliation` — filter controls
- `pageIndex` — pagination

The only difference between tabs is the **rendering style**.

### Shared Graph

The force graph on top remains shared. When switching tabs, the graph re-renders using the active tab's data context. Since state is shared, the graph doesn't actually need to change — same entities, same time range, same pins.

**However**, when the Network Timeline tab is active, the graph treats all entities as a single group (equivalent to `splitByAffiliation: false`).

### Component Structure

```
SpreadlineTabComponent (state orchestrator)
├── SpreadlineGraphComponent (shared, unchanged)
└── Bottom Panel
    ├── SpreadlineBottomTabsComponent (new tab bar)
    │   ├── "Spreadline" tab
    │   └── "Network Timeline" tab
    ├── SpreadlineComponent (when spreadline tab active)
    └── NetworkTimelineChartComponent (when network timeline tab active)
```

## File Changes

### New Files

```
src/features/spreadlines/components/
  spreadline-bottom-tabs.component.tsx    # Tab bar component
  network-timeline-chart.component.tsx    # D3 horizontal timeline chart
```

### Modified Files

```
src/features/spreadlines/components/
  spreadline-tab.component.tsx            # Add activeBottomTab state, render tab bar + active chart
src/features/spreadlines/
  utils.ts                                # Add transformSpreadlineToTimeline() function
  utils.test.ts                           # Tests for the new transform
  const.ts                                # Add network timeline constants
```

### Unchanged Files

```
src/features/spreadlines/components/
  spreadline-graph.component.tsx          # No changes
  spreadline-scrubber.component.tsx       # Reused as-is
  spreadline.component.tsx                # No changes
```

## Data Flow

```
API (SpreadlineRawDataResponse)
  │
  ▼
SpreadlineTabComponent
  ├── activeBottomTab: 'spreadline' | 'network-timeline'
  ├── selectedRange, pinnedEntityNames, blocksFilter, ... (shared state)
  │
  ├──► SpreadlineGraphComponent
  │      receives: selectedTimes, pinnedEntityNames, filteredEntityNames
  │      (same as current — no changes)
  │
  └──► Bottom Panel (conditional on activeBottomTab)
        ├── SpreadlineComponent (when 'spreadline')
        │     receives: all current props (unchanged)
        │
        └── NetworkTimelineChartComponent (when 'network-timeline')
              receives: rawData, selectedRange, selectedTimes, timeBlocks,
                        pinnedEntityNames, blocksFilter, onEntityPin, onFilteredEntityNamesChange,
                        onTimeClick, onHighlightRangeChange, pageIndex, totalPages, onPageChange
```

## Network Timeline Chart — Visual Design

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Toolbar: entity/block counts | freq legend |            │
│          blocks filter slider | relation type |         │
│          granularity | clear pins                       │
├─────────────────────────────────────────────────────────┤
│   2018     2019     2020     2021     2022     2023     │
│ ─────┬────────┬────────┬────────┬────────┬─────────    │
│ David  ●━━━━━━━━●━━━━━━━━●━━━━━━━━●━━━━━━━━●━━━━━●    │
│ Victor ●━━━━━━━━●━━━━━━━━●━━━━━━━━●━━━━━━━━●          │
│ Alice  ●━━━━━━━━━━━━━━━━━●━━━━━━━━●          ●━━━━●   │
│ Anna                                      ●            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ ◄ ■ ► [=====scrubber=====]  Page 1/5 ◄ ►              │
└─────────────────────────────────────────────────────────┘
```

### Chart Details

- **X-axis**: Time blocks (shared with spreadline), axis labels at top
- **Y-axis**: Entity names, sorted by **total activity count** (most active at top)
- **Ego entity**: First row, distinguished styling (bold name, ego color)
- **Dots**: Rendered at each time block where the entity has relations
- **Lines**: Connect consecutive active time blocks as horizontal segments
- **Color**: Citation frequency heatmap — same scale as spreadline:
  - Colors: `['#ffffff', '#fcdaca', '#e599a6', '#c94b77', '#740980']`
  - Thresholds: `[10, 50, 100, 500]`
  - Each segment colored by the **starting block's citation count**
- **Click entity name**: Pins/unpins the entity, highlights shortest path from ego in graph
- **Blocks filter**: Applies same filtering — entities with lifespan < blocksFilter are hidden

### Toolbar (Simplified)

Same toolbar structure as spreadline, minus affiliation-specific controls:

**Included:**
- Entity/block count stats
- Frequency heatmap legend
- Blocks filter slider
- Show labels checkbox
- Relation type dropdown
- Granularity dropdown
- Clear pins button
- Zoom controls + pagination

**Excluded (hidden when network timeline active):**
- Category color legend (internal/external)
- Split by affiliation checkbox
- Crossing only checkbox

## Data Transform

### New function: `transformSpreadlineToTimeline()`

```typescript
interface TimelineEntity {
  name: string;
  isEgo: boolean;
  totalActivity: number; // total relation count across all time blocks
  timeBlocks: Array<{
    time: string;
    citationCount: number;
  }>;
}

function transformSpreadlineToTimeline(
  rawData: SpreadlineRawDataResponse,
  selectedTimes?: string[]
): TimelineEntity[]
```

**Logic:**
1. For each entity in `rawData.entities`, compute which time blocks it appears in (from `rawData.topology`)
2. If `selectedTimes` provided, filter to only those time blocks
3. Sum citation counts per time block per entity (from `rawData.entities[id].citations`)
4. Sort entities by total activity count descending, ego always first
5. Return array of `TimelineEntity` objects

## Tab Bar Component

Simple tab bar with two options:

```
[Spreadline] [Network Timeline]
```

- Minimal styling: text tabs with active indicator (underline or background)
- Uses Shadcn Tabs component or simple buttons with active state
- Positioned at the top of the bottom panel, below the resizable divider

## Interaction Behaviors

### Pin Flow (Network Timeline)

1. User clicks entity name in the timeline chart
2. Toggle pin state for that entity
3. Call `onEntityPin` callback with updated pinned names array
4. Graph receives updated `pinnedEntityNames` → highlights BFS path from ego

### Time Selection

- Uses the same scrubber component at the bottom
- Same `selectedRange` state drives both tabs
- Clicking a time column in the chart calls `onTimeClick` to expand selection

### Blocks Filter

- Same slider in toolbar
- Filters which entities appear as rows in the timeline
- Updates `filteredEntityNames` for the graph

### Pagination

- Same page controls (20 blocks per page)
- Shared `pageIndex` state

## Implementation Notes

1. The `NetworkTimelineChartComponent` renders via D3 (similar to the existing `.nt` chart but adapted for spreadline data)
2. The chart uses an SVG with:
   - Band scale for Y-axis (entity names)
   - Linear/band scale for X-axis (time blocks)
   - Horizontal lines + circles for each entity's timeline
3. Entity name labels are clickable (pin behavior)
4. Selected time range is visually indicated (same highlight overlay style)
5. The toolbar is rendered **inside** each chart component (not shared) since some controls are chart-specific
