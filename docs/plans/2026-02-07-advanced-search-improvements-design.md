# Advanced Search Improvements - Design

## Overview

Improve the advanced search UX by adding live preview results and the ability to save search results as workspace files for graph visualization.

## Current Pain Points

1. **Blind pattern building** - Users type filters without seeing what matches until they hit Search
2. **List-only results** - Results display as a list, but graph visualization would show relationships better
3. **Mock data in results** - Sample dummy data prevents real testing

## Design

### 1. Live Preview in Results Panel

Show search results automatically as the user builds their pattern.

**Trigger conditions (ALL must be true):**
- All nodes are connected (no orphan nodes)
- At least one node has a filter (type filter OR attribute filter)

**Behavior:**
- Preview updates automatically with debounce (~300-500ms after changes)
- If nodes are disconnected → Show message: "Connect all nodes to see preview"
- If no filters → Show nothing (empty state)
- Reuses existing results panel - no new UI elements

**What triggers an update:**
- Adding/removing nodes
- Adding/removing edges
- Changing node type filter
- Adding/editing/removing attribute filters
- Changing edge predicates

### 2. "Show Graph" - Save as Workspace

Allow users to save search results as a workspace file for graph visualization.

**UI:**
- "Show Graph" button in results panel header (right side)
- Button disabled when no results

**Flow:**
1. User clicks "Show Graph"
2. Modal opens: "Save as Workspace"
3. Text input with default filename: `search-results.ws`
   - If file exists, increment: `search-results-2.ws`, `search-results-3.ws`...
4. Extension locked to `.ws` (user cannot change)
5. User clicks Save
6. Creates real `.ws` workspace file with matched entities and relationships
7. File opens in new tab as regular workspace
8. Full workspace graph features available (zoom, pan, select, popups, etc.)

**Benefits:**
- Zero new graph code - reuses existing workspace graph component
- Results become persistent files users can revisit
- Familiar UX - same interaction as any workspace tab

### 3. Remove Mock Data

Remove sample/dummy response from pattern results component to enable real testing.

**Change:**
- `pattern-results.component.tsx` currently has hardcoded mock data
- Replace with actual API response from `usePatternSearchMutation`

## Files to Modify

```
src/features/pattern-search/
├── components/
│   ├── advanced-search.component.tsx    # Add auto-search trigger logic
│   ├── pattern-results.component.tsx    # Remove mock data, add "Show Graph" button
│   └── save-workspace-modal.component.tsx  # NEW: Modal for saving as .ws
├── hooks/
│   └── usePatternSearchMutation.ts      # May need adjustment for live preview
└── utils.ts                             # NEW: Helper to convert PatternMatch[] to workspace format
```

```
src/features/editor/
└── (existing file creation logic)       # Reuse for creating .ws file
```

## Out of Scope

- Autocomplete for filter values
- Match counts on nodes
- Progressive/faceted filtering
- Changes to the pattern builder canvas itself
