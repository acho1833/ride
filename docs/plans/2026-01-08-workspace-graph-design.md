# Workspace Graph Editor Design

## Overview

Implement a D3.js force-directed graph for `.ws` (workspace) files with drag/drop nodes, pan/zoom, and control buttons.

## File Structure

```
src/features/workspace/
├── components/
│   └── workspace-graph.component.tsx   # Main D3 graph component
├── const.ts                            # Graph config, sample data generator
└── types.ts                            # Node/Link type definitions

Modified:
└── src/features/editor/components/editor-content.component.tsx
```

## Types

```typescript
// types.ts
interface GraphNode {
  id: string;
  name: string;
  x?: number;
  y?: number;
  fx?: number | null;  // Fixed x (during drag)
  fy?: number | null;  // Fixed y (during drag)
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
```

## Sample Data

- 10 nodes with random common names
- ~50% connected (4-6 links randomly distributed)
- 2 guaranteed isolated nodes
- Names pool: John Smith, Jane Doe, Bob Johnson, Alice Williams, Charlie Brown, Diana Prince, Edward Norton, Fiona Apple, George Miller, Hannah Montana

## Rendering Strategy (Performance Critical)

### React's Role (Minimal)
- Render SVG container once on mount
- Render control buttons (Shadcn)
- Re-render ONLY if GraphData prop changes

### D3's Role (All Dynamic Updates)
- Create/update nodes and links via D3 selections
- Force simulation tick updates (`cx`, `cy`, `x1`, `y1`, `x2`, `y2`)
- Drag behavior (updates `fx`, `fy` directly)
- Zoom/pan (updates container `<g>` transform)

### Implementation Pattern

```typescript
const svgRef = useRef<SVGSVGElement>(null);
const gRef = useRef<SVGGElement | null>(null);

useEffect(() => {
  if (!svgRef.current) return;

  const svg = d3.select(svgRef.current);
  const g = svg.append('g');
  gRef.current = g.node();

  // D3 takes full control from here
  // - Setup zoom behavior on svg
  // - Setup force simulation
  // - Create links and nodes selections
  // - Setup drag behavior on nodes

  return () => { /* cleanup */ };
}, [data]); // Only re-run if data changes
```

## Component Structure

```tsx
<div className="relative h-full w-full">
  {/* D3-controlled SVG */}
  <svg ref={svgRef} className="h-full w-full">
    {/* D3 will append <g> with links and nodes */}
  </svg>

  {/* React-controlled buttons */}
  <div className="absolute bottom-4 right-4 flex flex-col gap-2">
    <Button onClick={handleZoomIn}><Plus /></Button>
    <Button onClick={handleZoomOut}><Minus /></Button>
    <Button onClick={handleCenter}><Crosshair /></Button>
  </div>
</div>
```

## Interactions

| Action | Handler | Implementation |
|--------|---------|----------------|
| Drag node | D3 drag | Sets `fx`/`fy` on dragstart, updates on drag, clears on dragend |
| Mouse wheel | D3 zoom | `d3.zoom().on('zoom', ...)` transforms container `<g>` |
| Pan (drag background) | D3 zoom | Same zoom behavior handles pan |
| Zoom In button | React → D3 | `svg.transition().call(zoom.scaleBy, 1.3)` |
| Zoom Out button | React → D3 | `svg.transition().call(zoom.scaleBy, 0.7)` |
| Center button | React → D3 | `svg.transition().call(zoom.transform, d3.zoomIdentity)` |

## Visual Design

- **Nodes**: Circles with `fill: primary`, radius 20px
- **Node labels**: Name text centered below node
- **Links**: Lines with `stroke: muted-foreground`, opacity 0.6
- **Background**: Transparent (inherits from editor)
- **Control buttons**: Shadcn Button variant="outline" size="icon"

## Constants

```typescript
// const.ts
export const GRAPH_CONFIG = {
  nodeRadius: 20,
  linkDistance: 100,
  chargeStrength: -300,
  centerForce: 0.1,
} as const;

export const SAMPLE_NAMES = [
  'John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Williams',
  'Charlie Brown', 'Diana Prince', 'Edward Norton', 'Fiona Apple',
  'George Miller', 'Hannah Montana'
] as const;
```

## Implementation Checklist

- [x] Create `src/features/workspace/types.ts`
- [x] Create `src/features/workspace/const.ts` with config and sample data generator
- [x] Create `src/features/workspace/components/workspace-graph.component.tsx`
- [x] Update `editor-content.component.tsx` to route `.ws` files
- [x] Build passes with no errors

---

## Review

### Changes Made

**New files created:**
| File | Purpose |
|------|---------|
| `src/features/workspace/types.ts` | GraphNode, GraphLink, GraphData types extending D3 SimulationNodeDatum |
| `src/features/workspace/const.ts` | GRAPH_CONFIG constants + generateSampleData() function |
| `src/features/workspace/components/workspace-graph.component.tsx` | D3 force-directed graph with drag/zoom |

**Files modified:**
| File | Change |
|------|--------|
| `src/features/editor/components/editor-content.component.tsx` | Route `.ws` files to WorkspaceGraphComponent |

### Architecture Decisions

1. **D3 owns the DOM**: React renders SVG container once, D3 handles all dynamic updates (drag, zoom, simulation ticks). No React re-renders during interactions.

2. **Refs for D3 objects**: `zoomRef` and `simulationRef` store D3 behaviors so button handlers can access them without triggering re-renders.

3. **Data deep copy**: Nodes/links are copied before passing to D3 to prevent mutation of React state.

4. **CSS variables for theming**: Uses `hsl(var(--primary))`, `hsl(var(--foreground))` etc. for dark/light mode support.

### Features Implemented

- 10 random nodes with shuffled names
- ~50% connectivity with 2 guaranteed isolated nodes
- Drag nodes to reposition (force simulation updates)
- Pan by dragging background
- Zoom with mouse wheel
- Zoom In/Out/Center buttons (lower right)
- Smooth transitions on button clicks (300ms)
