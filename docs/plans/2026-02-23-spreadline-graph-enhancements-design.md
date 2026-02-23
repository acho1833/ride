# Spreadline Force Graph Enhancements

## Overview

Enhance the force-directed graph in the spreadline feature to encode citation data on links and provide hover tooltips for exploration.

## Features

### 1. Link Color by Citation Count

Color each link using the existing 5-band threshold scale:

| Threshold | Color | Hex |
|-----------|-------|-----|
| < 10 | White | `#ffffff` |
| 10–50 | Light pink | `#fcdaca` |
| 50–100 | Pink | `#e599a6` |
| 100–500 | Dark pink | `#c94b77` |
| 500+ | Purple | `#740980` |

Reuses `SPREADLINE_FREQUENCY_COLORS` and `SPREADLINE_FREQUENCY_THRESHOLDS` from `const.ts`.

### 2. Link Thickness by Citation Count

Same 5-band thresholds, each mapped to a fixed width:

| Threshold | Width |
|-----------|-------|
| < 10 | 1px |
| 10–50 | 2px |
| 50–100 | 3px |
| 100–500 | 4px |
| 500+ | 6px |

New constant: `GRAPH_LINK_WIDTH_BANDS = [1, 2, 3, 4, 6]`.

### 3. Citation Count Label on Links

- Display aggregated citation count as text at the link midpoint
- Only show for links with 10+ citations (reuse first threshold)
- Small font (10px), semi-transparent dark background pill for readability
- Labels update position on simulation tick and drag

### 4. Node Hover Tooltip

On hover, show a styled tooltip with:
- Author name
- Category (internal / external)
- Total citations in current view
- Number of direct collaborators

### 5. Link Hover Tooltip

On hover, show a styled tooltip with:
- Both author names
- Total citation count
- Number of co-authored papers
- Years of collaboration

## Data Changes

### `SpreadlineGraphLink` (utils.ts)

Add fields:

```typescript
export interface SpreadlineGraphLink extends SimulationLinkDatum<SpreadlineGraphNode> {
  source: string | SpreadlineGraphNode;
  target: string | SpreadlineGraphNode;
  weight: number;      // Aggregated citation count
  paperCount: number;  // Number of co-authored papers
  years: string[];     // Years of collaboration
}
```

### `SpreadlineGraphNode` (utils.ts)

Add field:

```typescript
export interface SpreadlineGraphNode extends SimulationNodeDatum {
  // ... existing fields
  totalCitations: number;  // Sum of citation weights for this node's links
}
```

### Transform Functions (utils.ts)

- `transformSpreadlineToGraph`: aggregate `weight`, `paperCount`, `years` when deduplicating links; compute `totalCitations` per node
- `transformSpreadlineToGraphByTime`: same aggregation for single time block
- `transformSpreadlineToGraphByTimes`: same aggregation across time range

### Constants (const.ts)

```typescript
export const GRAPH_LINK_WIDTH_BANDS = [1, 2, 3, 4, 6];
export const GRAPH_LINK_LABEL_MIN_THRESHOLD = 10;
```

## Rendering Changes (spreadline-graph.component.tsx)

### Link Rendering

- Replace uniform `GRAPH_CONFIG.linkStroke` with D3 threshold color scale
- Replace uniform `GRAPH_CONFIG.linkStrokeWidth` with threshold-based width
- Add SVG `<text>` + `<rect>` background at link midpoints for labels

### Link Label Group

- New `g.labels` SVG group alongside `g.links` and `g.nodes`
- Each label: `<rect>` background + `<text>` centered at midpoint
- Updated on simulation tick (same pattern as links x1/y1/x2/y2)
- Only created for links with weight >= 10

### Tooltip

- HTML `<div>` positioned absolutely within the container
- Styled with CSS variables (bg-popover, text-popover-foreground, border, shadow)
- Positioned near mouse on mouseover, hidden on mouseout
- Separate content rendering for nodes vs links

### Pin Highlight Interaction

- Pin highlighting continues to override link colors/widths (blue path)
- When pins are cleared, links revert to citation-based colors/widths

## Files to Modify

- `src/features/spreadlines/utils.ts` — extend interfaces, update transform functions
- `src/features/spreadlines/const.ts` — add width bands and label threshold constants
- `src/features/spreadlines/components/spreadline-graph.component.tsx` — link rendering, labels, tooltips

## Files Unchanged

- `src/features/spreadlines/components/spreadline.component.tsx` — main chart untouched
- `src/lib/spreadline-viz/` — core algorithm untouched
- `src/features/spreadlines/server/` — data service untouched
