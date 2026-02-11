# Drag Entity to Pattern Builder

## Problem

Building pattern search queries from scratch is tedious. Users must manually add nodes, pick types from dropdowns, and type attribute filters. There's no way to start from a known entity or refine a pattern using search results.

## Solution

Two entry points for adding entities to the pattern builder:

1. **"Add to Pattern" button** in the entity detail popup (double-click a graph node)
2. **Drag-and-drop** from search result entity cards onto the pattern builder canvas

Both create a new pattern node pre-populated with the entity's type and name.

## UX Flow

### From Entity Detail Popup (Graph Node)

1. User double-clicks a node in the workspace graph
2. Entity detail popup appears (existing behavior)
3. User clicks new "Add to Pattern" icon button (Crosshair icon, next to Expand button)
4. System:
   - Opens entity search panel (left toolbar) if not already open
   - Switches to Advanced mode
   - Creates a new pattern node with type + name filter pre-filled
   - Node is auto-selected, so config panel opens for immediate editing

### From Search Results (Entity Cards)

1. User has an active pattern search with results in the bottom panel
2. User expands a match row to see entity cards
3. User drags an entity card onto the pattern builder canvas (top panel)
4. New pattern node appears at drop position with type + name filter pre-filled

## Technical Design

### New Store Action: `addNodeFromEntity`

Added to `pattern-search.store.ts`:

```typescript
addNodeFromEntity: (entityType: string, entityName: string) => {
  // Creates PatternNode with:
  // - id: `node-${Date.now()}`
  // - label: auto-generated (Node A, B, etc.)
  // - type: entityType
  // - filters: [{ attribute: 'labelNormalized', patterns: [entityName] }]
  // - position: auto-calculated from existing nodes
  // - Auto-selected (selectedNodeId = newNode.id)
}
```

### Files Modified

| File | Change |
|------|--------|
| `src/stores/pattern-search/pattern-search.store.ts` | Add `addNodeFromEntity` action |
| `src/stores/pattern-search/pattern-search.selector.ts` | Export new action in selector |
| `src/features/workspace/components/entity-detail-popup.component.tsx` | Add "Add to Pattern" button |
| `src/features/pattern-search/components/pattern-builder.component.tsx` | Add drop handler for entity cards |

### Entity Detail Popup Layout

```
Before: [drag] [icon] Entity Name    [expand] [close]
After:  [drag] [icon] Entity Name [pattern] [expand] [close]
```

The [pattern] button uses the Crosshair icon from lucide-react.

### Drop Target on Pattern Builder

The React Flow container div gets `onDragOver` and `onDrop` handlers. On drop:
- Parse entity JSON from `dataTransfer.getData('application/json')`
- Call `addNodeFromEntity(entity.type, entity.labelNormalized)`

## What Does NOT Change

- Entity card drag to workspace graphs (existing behavior preserved)
- Pattern builder "Add Node" button (still works for blank nodes)
- All existing pattern search functionality
