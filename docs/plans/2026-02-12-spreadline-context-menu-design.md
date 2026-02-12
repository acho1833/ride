# SpreadLine Context Menu Integration - Design

## Overview

Add a context menu option when the user right-clicks an entity in the workspace graph. Selecting "Spreadline" opens a SpreadLine visualization in the bottom panel tab. For now, uses dummy vis-author CSV data (Jeffrey Heer co-authorship network) regardless of which entity is clicked.

## Architecture

### Data Flow

1. User right-clicks entity in workspace graph → selects "Spreadline" from context menu
2. `workspace.component.tsx` calls `handleSpreadline(entityId)` → opens SPREADLINE tab in bottom panel
3. `SpreadlineComponent` mounts → fetches raw data via ORPC hook (`useSpreadlineRawDataQuery`)
4. ORPC route reads CSV files from `data/spreadline/vis-author/`, constructs ego network, returns `RawDataResponse`
5. Component runs `SpreadLine` class client-side → computes layout → produces `SpreadLineData`
6. `SpreadLineChart` wrapper passes data to `SpreadLineVisualizer` (D3 class) for rendering

### Tab Behavior

- Tab ID: `spreadline-${entityId}` for stable identity
- Tab name: `Spreadline: ${entityName}`
- Re-clicking same entity activates existing tab (no duplicates)
- For now with dummy data, all tabs show Jeffrey Heer dataset

## Phase 1: Port and Verify

Port the working code from `spreadline2` into Ride and create a test page at `/spreadline-frontend1` for verification before integrating into the context menu.

### File Structure

```
# SpreadLine algorithm (copy from spreadline2/lib/spreadline/)
src/lib/spreadline/
  index.ts
  types.ts
  spreadline.ts
  constructors.ts
  order.ts
  align.ts
  compact.ts
  contextualize.ts
  render.ts
  helpers.ts

# D3 visualization (copy from spreadline2/app/react-design11/components/)
src/lib/spreadline-viz/
  index.ts
  spreadline-chart.tsx        (from SpreadLineChart.tsx)
  spreadline-visualizer.ts    (from SpreadLineVisualizer.ts)
  spreadline-expander.ts      (from Expander.ts)
  spreadline-collapser.ts     (from Collapser.ts)
  spreadline-d3-utils.ts      (from d3-utils.ts)
  spreadline-types.ts         (from types.ts)

# CSV data files (copy from spreadline2/SpreadLine-main/case-studies/vis-author/)
data/spreadline/vis-author/
  entities.csv
  relations.csv
  citations.csv

# ORPC route for raw data
src/features/spreadlines/
  server/
    routers.ts
    services/
      spreadline-data.service.ts
  hooks/
    useSpreadlineRawDataQuery.ts

# Test page
src/app/spreadline-frontend1/page.tsx

# Existing files to modify
src/lib/orpc/router.ts                                                  # Register spreadline router
```

### Implementation Steps

1. Copy CSV data files to `data/spreadline/vis-author/`
2. Copy SpreadLine algorithm files to `src/lib/spreadline/`
3. Copy D3 visualization files to `src/lib/spreadline-viz/`
4. Install `papaparse` dependency (for CSV parsing on server)
5. Create ORPC service (`spreadline-data.service.ts`) - port CSV loading + ego network logic from `spreadline-raw/route.ts`
6. Create ORPC router (`routers.ts`) - expose `getRawData` endpoint
7. Register router in `src/lib/orpc/router.ts`
8. Create query hook (`useSpreadlineRawDataQuery.ts`)
9. Create test page (`src/app/spreadline-frontend1/page.tsx`) - mirrors working spreadline-frontend1 from spreadline2
10. Verify visualization works at `localhost:3000/spreadline-frontend1`

## Phase 2: Context Menu Integration + Refactor to CLAUDE.md (after verification)

Integrate into context menu/bottom panel AND follow CLAUDE.md conventions in the same pass. No point writing code wrong and then fixing it.

### Files to Modify

```
src/features/workspace/components/workspace-context-menu.component.tsx  # Enable Spreadline menu item, pass entity data
src/features/workspace/components/workspace.component.tsx               # Add handleSpreadline callback
src/stores/type-tabs/type-tabs.store.ts                                 # Remove 3 placeholder tabs, update SpreadlineData type
src/features/spreadlines/components/spreadline.component.tsx            # Replace placeholder with real visualization
```

### Implementation Steps

1. Update `workspace-context-menu.component.tsx` - enable "Spreadline" menu item, add `onSpreadline` callback prop
2. Update `workspace.component.tsx` - add `handleSpreadline` callback that opens SPREADLINE tab (same pattern as `handleOpenDashboard`)
3. Update `type-tabs.store.ts` - remove 3 placeholder SPREADLINE tabs from default state, update `SpreadlineData` interface
4. Update `spreadline.component.tsx` - replace static image with real SpreadLine visualization (fetch data, compute layout, render chart)

### CLAUDE.md Conventions Applied During Integration

1. **Naming conventions** - Rename files to match Ride patterns:
   - `spreadline-chart.tsx` → `spreadline-chart.component.tsx`
   - Ensure all component files export exactly ONE component
2. **No magic values** - Extract hardcoded values to `src/features/spreadlines/const.ts`:
   - Colors (`#FA9902`, `#166b6b`, `#424242`)
   - Ego name (`"Jeffrey Heer"`)
   - API paths, timeouts, config values
3. **TypeScript & Zod** - Define explicit interfaces (never `z.infer`), add Zod schemas for ORPC input/output validation
4. **Theming** - Replace hardcoded colors in D3 styles with Shadcn CSS variables where applicable (background, foreground, border, etc.)
5. **Hook patterns** - Ensure all hooks follow `use<Entity><Action>` naming and use `orpc.[feature].[method].queryOptions()` pattern
6. **Service pattern** - Ensure service uses `import 'server-only'` and throws `ORPCError` for errors
7. **Keep test page** - Keep `src/app/spreadline-frontend1/page.tsx` for ongoing testing
8. **Lint & format** - Run `npm run lint` and `npm run format` to ensure code passes all checks

## Key Decisions

- **Dummy data**: Always shows Jeffrey Heer vis-author dataset regardless of entity clicked
- **Algorithm**: Full SpreadLine algorithm (10 files from lib/spreadline/)
- **Visualizer**: Full D3 visualizer with all interactions (block expand/collapse, hover/pin, brush)
- **Data loading**: ORPC route reads CSV files from `data/spreadline/vis-author/`
- **Verification first**: Port to test page at `/spreadline-frontend1` before integrating into context menu
