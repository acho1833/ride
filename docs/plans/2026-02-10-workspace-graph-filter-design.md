# Workspace Graph Filter

## Overview

Add a filter feature to the workspace graph that lets users show/hide nodes by entity type and relationships by predicate. Filter state is stored in the existing workspace-graph Zustand store (per-workspace). The UI consists of a top toolbar with a filter toggle button and a right-side filter panel with eye open/closed toggles.

## UI Design

### Top Toolbar
- Thin horizontal bar above the graph canvas
- Filter button on the right side with `ListFilter` icon
- Badge shows count of hidden items (hidden types + hidden predicates)
- No badge when everything is visible
- Future-proof: more buttons can be added to the left side later

### Filter Panel (Right Sidebar)
- Opens/closes via the toolbar filter button
- Positioned on the right side, above the minimap/zoom controls (no overlap)
- Semi-transparent card style matching existing minimap panel (`bg-background/80`)
- Close button (X) in the header
- Two sections with headers: "Entity Types" and "Relationships"
- Each item has an eye toggle: `Eye` icon = visible, `EyeOff` icon = hidden
- Each section is independently scrollable when items exceed max height
- "Reset All" button at the bottom to clear all filters
- Panel itself has max-height to never overlap the minimap

### Toggle Behavior
- Eye open (default): entity type or predicate is visible
- Click eye: toggles to eye closed, hides matching nodes/links
- Hiding an entity type hides all nodes of that type AND any links connected to those nodes
- Hiding a predicate hides all links with that predicate (nodes remain visible)

## Store Design

Extend existing `workspace-graph` store. Store what's **hidden** (not visible) so default = everything shown.

### New State (per workspace entry)
```typescript
interface WorkspaceGraphEntry {
  selectedEntityIds?: string[];    // existing
  openPopups?: PopupState[];       // existing
  hiddenEntityTypes?: string[];    // NEW - hidden entity types
  hiddenPredicates?: string[];     // NEW - hidden relationship predicates
  isFilterPanelOpen?: boolean;     // NEW - filter panel open/closed
}
```

### New Actions
```typescript
toggleEntityTypeVisibility(workspaceId: string, entityType: string): void
togglePredicateVisibility(workspaceId: string, predicate: string): void
resetFilters(workspaceId: string): void
setFilterPanelOpen(workspaceId: string, open: boolean): void
```

### New Selectors
```typescript
useHiddenEntityTypes(workspaceId: string): string[]
useHiddenPredicates(workspaceId: string): string[]
useIsFilterPanelOpen(workspaceId: string): boolean
useHiddenFilterCount(workspaceId: string): number  // badge count
useGraphFilterActions(): { toggleEntityTypeVisibility, togglePredicateVisibility, resetFilters, setFilterPanelOpen }
```

## Data Flow

1. User clicks eye icon in filter panel
2. Zustand action updates `hiddenEntityTypes` or `hiddenPredicates`
3. Selector hooks trigger re-render in `workspace.component.tsx`
4. `workspace.component.tsx` computes filtered lists via `useMemo`:
   - `filteredEntityList` = entities where type is NOT in hiddenEntityTypes
   - `filteredEntityMap` = Map from filteredEntityList
   - `filteredRelationshipList` = relationships where:
     - predicate is NOT in hiddenPredicates
     - AND source entity is in filteredEntityMap
     - AND target entity is in filteredEntityMap
5. Filtered data passed to `WorkspaceGraphComponent`
6. Graph renders only visible nodes/links

## File Changes

### New Files
- `src/features/workspace/components/workspace-toolbar.component.tsx` — top toolbar with filter button + badge
- `src/features/workspace/components/workspace-filter-panel.component.tsx` — right sidebar with eye toggles, scrollable sections, reset

### Modified Files
- `src/stores/workspace-graph/workspace-graph.store.ts` — add filter state + actions
- `src/stores/workspace-graph/workspace-graph.selector.ts` — add filter selectors
- `src/features/workspace/components/workspace.component.tsx` — add toolbar, filter panel, compute filtered data
- `src/features/workspace/components/workspace-graph.component.tsx` — layout adjustment if needed

## Deriving Filter Options

Entity types and predicates are derived dynamically from workspace data (not hardcoded):
- Entity types: `[...new Set(workspace.entityList.map(e => e.type))]`
- Predicates: `[...new Set(workspace.relationshipList.map(r => r.predicate))]`

This means the filter panel automatically shows whatever types/predicates exist in the current workspace.
