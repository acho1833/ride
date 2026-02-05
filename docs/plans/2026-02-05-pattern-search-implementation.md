# Pattern Search (Advanced Search) Implementation

## Overview

This document describes the implementation of the Pattern Search feature, which allows users to visually build graph query patterns using a drag-and-drop interface and find matching subgraphs in the entity database.

**Goal:** Enable users to search for entities connected by specific relationship patterns, not just individual entity properties.

**Architecture:** React Flow for visual pattern building, Zustand for pattern state management, ORPC for API layer, recursive backtracking algorithm for pattern matching.

**Tech Stack:** React Flow (@xyflow/react), Zustand, React Query, ORPC, Zod

---

## Feature Structure

```
src/features/pattern-search/
├── server/
│   ├── routers.ts                    # ORPC procedure definitions
│   └── services/
│       └── pattern.service.ts        # Pattern matching algorithm
├── hooks/
│   ├── usePatternSearchMutation.ts   # Execute pattern search
│   └── usePredicatesQuery.ts         # Fetch available predicates
├── components/
│   ├── advanced-search.component.tsx      # Main container (builder + results)
│   ├── pattern-builder.component.tsx      # React Flow canvas + toolbar
│   ├── pattern-node.component.tsx         # Custom node component
│   ├── pattern-edge.component.tsx         # Custom edge component
│   ├── node-config-panel.component.tsx    # Node filter configuration
│   ├── edge-config-panel.component.tsx    # Edge predicate configuration
│   ├── pattern-results.component.tsx      # Results list with pagination
│   └── pattern-match-row.component.tsx    # Single result row (expandable)
├── types.ts                          # Type definitions
└── const.ts                          # Constants and configuration

src/stores/pattern-search/
├── pattern-search.store.ts           # Zustand slice definition
└── pattern-search.selector.ts        # Selector hooks
```

---

## Type Definitions

### Core Types (types.ts)

```typescript
/** Search mode - simple (entity search) or advanced (pattern matching) */
type SearchMode = 'simple' | 'advanced';

/** A filter on an entity attribute (e.g., name contains "John") */
interface PatternNodeFilter {
  attribute: string;    // e.g., 'labelNormalized', 'email'
  value: string;        // Filter value (supports regex)
}

/** A node in the pattern graph representing entity constraints */
interface PatternNode {
  id: string;
  label: string;                        // User-facing label (e.g., "Node 1")
  entityType: string | null;            // null = any type
  filters: PatternNodeFilter[];         // AND logic between filters
  position: { x: number; y: number };   // Canvas position
}

/** An edge in the pattern graph representing relationship constraints */
interface PatternEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  predicates: string[];    // Empty = any predicate (OR logic)
}

/** Complete pattern for searching */
interface SearchPattern {
  nodes: PatternNode[];
  edges: PatternEdge[];
}

/** A single match result - entities forming a connected subgraph */
interface PatternMatch {
  entities: Entity[];
  relationships: Relationship[];
}

/** Paginated search response */
interface PatternSearchResponse {
  matches: PatternMatch[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
```

---

## Store Design

### State Structure (pattern-search.store.ts)

```typescript
interface PatternSearchState {
  patternSearch: {
    mode: SearchMode;
    nodes: PatternNode[];
    edges: PatternEdge[];
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
  };
}
```

### Actions

| Action | Description |
|--------|-------------|
| `setSearchMode(mode)` | Toggle between simple/advanced modes |
| `addNode(node)` | Add a new pattern node |
| `updateNode(id, updates)` | Update node properties |
| `deleteNode(id)` | Remove node and connected edges |
| `addNodeFilter(nodeId, filter)` | Add attribute filter to node |
| `updateNodeFilter(nodeId, index, filter)` | Update existing filter |
| `removeNodeFilter(nodeId, index)` | Remove filter from node |
| `addEdge(edge)` | Create connection between nodes |
| `updateEdge(id, updates)` | Update edge predicates |
| `deleteEdge(id)` | Remove edge |
| `selectNode(id)` | Select node for editing |
| `selectEdge(id)` | Select edge for editing |
| `clearPattern()` | Reset entire pattern |

---

## API Layer

### ORPC Router (server/routers.ts)

```typescript
// POST /patterns/search - Execute pattern search
patternRouter.search
  .input({ pattern: searchPatternSchema, pageNumber, pageSize })
  .output(patternSearchResponseSchema)

// GET /patterns/predicates - Get available relationship predicates
patternRouter.predicates
  .output(z.array(z.string()))
```

### Pattern Matching Algorithm (server/services/pattern.service.ts)

The service implements a **recursive backtracking algorithm**:

1. **Entity Matching:**
   - Filter by entity type (null matches any)
   - Apply attribute filters with AND logic
   - Supports regex patterns with fallback to case-insensitive substring

2. **Relationship Matching:**
   - Match predicate against filter list (empty = any)
   - Detect direction (forward/reverse) for display

3. **Subgraph Discovery:**
   - Recursively find valid entity combinations
   - Ensure no entity appears twice in a match
   - Sort results by node label for consistency

---

## Component Architecture

### 1. AdvancedSearchComponent
- Container with ResizablePanelGroup (vertical split)
- Top panel: PatternBuilderComponent (60% default)
- Bottom panel: PatternResultsComponent (40% default)
- Handles search execution and state management

### 2. PatternBuilderComponent
- React Flow canvas for visual pattern construction
- Toolbar: Add Node button, Search button
- Config panel: Shows NodeConfigPanel or EdgeConfigPanel based on selection
- Keyboard: Delete/Backspace removes selected node/edge

### 3. PatternNodeComponent
- Custom React Flow node
- Displays: label, entity type badge, filter count
- Visual: rounded rectangle with selection highlighting

### 4. PatternEdgeComponent
- Custom React Flow edge with predicate label
- Displays predicate text on edge line
- Supports directional arrows

### 5. NodeConfigPanelComponent
- Entity type selector (dropdown)
- Attribute filter list with add/remove
- Filter: attribute selector + value input

### 6. EdgeConfigPanelComponent
- Multi-select for predicates
- Fetches available predicates via usePredicatesQuery

### 7. PatternResultsComponent
- Displays match count header
- ScrollArea with PatternMatchRowComponent items
- Pagination controls (prev/next buttons)

### 8. PatternMatchRowComponent
- Collapsed: Horizontal chain of entity chips with relationship arrows
- Expanded: Entity cards (flex-wrap) for drag-and-drop to workspace
- Uses EntityCardComponent for consistent appearance and drag support

---

## UI Integration

### Entity Search Component Integration

The pattern search is integrated into the existing Entity Search panel via a radio toggle:

```typescript
// src/features/entity-search/components/entity-search.component.tsx
<RadioGroup value={mode} onValueChange={handleModeChange}>
  <RadioGroupItem value="simple" /> Simple
  <RadioGroupItem value="advanced" /> Advanced
</RadioGroup>

{mode === 'simple' && <EntitySearchFormComponent />}
{mode === 'advanced' && <AdvancedSearchComponent />}
```

### Styling

Dark mode support for React Flow controls added to `globals.css`:
- Controls background uses `var(--card)`
- Button fill uses `var(--foreground)`
- Hover states use `var(--muted)`

---

## Constants (const.ts)

```typescript
/** Default page size for results */
DEFAULT_PATTERN_PAGE_SIZE = 50;

/** Minimum width in advanced mode */
ADVANCED_SEARCH_MIN_WIDTH = 'min-w-[600px]';

/** Auto-generated node label prefix */
NODE_LABEL_PREFIX = 'Node';

/** Position offset for new nodes */
NEW_NODE_OFFSET = { x: 200, y: 100 };

/** Available entity attributes for filtering */
ENTITY_ATTRIBUTES = [
  { key: 'labelNormalized', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department' }
];
```

---

## Mock Data (Current State)

For UI experimentation, pattern-results.component.tsx includes mock data:
- 10 sample matches with 3-5 entities each
- Uses **real entity IDs** from dummyData.json (e.g., `person-1`, `org-1`)
- Enables drag-and-drop testing to workspace graph

When production API is ready, remove mock data and use actual search results.

---

## User Interaction Flow

1. **Switch to Advanced Mode:** Click "Advanced" radio button
2. **Build Pattern:**
   - Click "Add Node" to add entity constraints
   - Click on node to configure type/filters
   - Drag from node handle to create edge
   - Click on edge to configure predicates
   - Delete key removes selected element
3. **Execute Search:** Click "Search" button
4. **View Results:**
   - Scroll through matches in results panel
   - Click row to expand and see entity cards
5. **Add to Workspace:**
   - Drag entity card from expanded result
   - Drop on workspace graph

---

## Key Implementation Decisions

1. **React Flow over D3:** Chose React Flow for pattern builder due to better React integration and built-in node/edge handling. Workspace graph still uses D3 for performance with large graphs.

2. **Zustand for Pattern State:** Client-side state management keeps pattern state reactive and persisted to sessionStorage.

3. **Mock Data with Real IDs:** Mock entities use IDs from dummyData.json so drag-and-drop works with existing workspace infrastructure.

4. **Expandable Result Rows:** Compact view shows chain summary; expanded view provides full entity cards for easy drag-and-drop.

5. **Resizable Panels:** User can adjust split between pattern builder and results based on workflow preference.

---

## Files Changed Summary

### New Files
- `src/features/pattern-search/` (entire directory)
- `src/stores/pattern-search/` (entire directory)

### Modified Files
- `src/lib/orpc/router.ts` - Register pattern router
- `src/stores/app.store.ts` - Register pattern search slice
- `src/features/entity-search/components/entity-search.component.tsx` - Add mode toggle
- `src/app/globals.css` - React Flow dark mode styles

---

## Testing Checklist

- [ ] Add node via toolbar button
- [ ] Configure node entity type filter
- [ ] Add attribute filter to node
- [ ] Connect two nodes with edge
- [ ] Configure edge predicates
- [ ] Delete node/edge with Delete key
- [ ] Execute search (uses mock data for now)
- [ ] View paginated results
- [ ] Expand result row to see entity cards
- [ ] Drag entity card to workspace graph
- [ ] Resize panel separator
- [ ] Switch between simple/advanced modes
- [ ] Dark mode styling correct

---

## Future Enhancements

1. **Real API Integration:** Replace mock data with actual pattern matching service
2. **Save/Load Patterns:** Allow users to save and reuse query patterns
3. **Pattern Templates:** Pre-built patterns for common queries
4. **Batch Add to Workspace:** Add entire match (all entities) to workspace at once
5. **Regex Help:** Tooltip or modal explaining regex syntax support
