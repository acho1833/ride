# Live 1-Hop Preview for Workspace Graph

## Overview

Add a live preview feature that shows 1-hop connections when a user Alt+Clicks an entity in the workspace graph. Preview entities are visually distinct (dashed borders, reduced opacity) and can be easily added to the graph.

## User Interaction

### Triggering Preview

- **Alt+Click** on any entity node activates preview mode
- Fetches all related entities not currently in the graph
- Displays preview entities around the selected node

### Display Modes

| Connection Count | Display Mode |
|------------------|--------------|
| ≤ 50 entities | Individual preview nodes with dashed borders |
| > 50 entities | Circular grouped summary nodes by entity type |

### Adding Entities to Graph

**Individual Preview Nodes:**
- Hover to reveal [+] button
- Click [+] to add entity to graph
- Drag and drop to graph (adds at drop position)

**Grouped Summary Nodes:**
- Click to open paginated popup list
- Popup shows compact entity rows (icon + name)
- Hover row to reveal [+] button
- Drag and drop from popup to graph
- Entities already in graph shown dimmed with [✓]

### Exiting Preview

- Click on empty canvas
- Press Escape key
- Alt+Click the same source node (toggle off)
- Click [Dismiss] button on toast notification

## Visual Design

### Individual Preview Nodes

| Property | Value |
|----------|-------|
| Shape | Square (same as regular nodes, 40x40px) |
| Border | 2px dashed, muted gray color |
| Fill | Entity type color at 60% opacity |
| Icon | Entity type icon (32x32px) |
| Label | Entity name below, slightly dimmed |
| Connecting line | Dashed line to source entity |

**Hover State:**
- Border becomes solid
- [+] icon overlay appears
- Cursor changes to pointer

### Grouped Summary Nodes

| Property | Value |
|----------|-------|
| Shape | Circle (distinguishes from regular square nodes) |
| Border | 2px dashed, muted gray |
| Fill | Entity type color at 60% opacity |
| Size | 40px diameter |
| Icon | Entity type icon |
| Count badge | Small pill in corner (e.g., "312") |
| Label | Type name below (e.g., "Organizations") |

### Grouped Summary Popup

```
┌─────────────────────────────────────┐
│ [Icon] Organizations (312)      [X] │
├─────────────────────────────────────┤
│ [🔍 Search organizations...]        │
├─────────────────────────────────────┤
│ [🏢] Acme Corp                  [✓] │  ← dimmed, already in graph
│ [🏢] Beta Industries            [+] │  ← hovered, shows +
│ [🏢] Gamma LLC                      │  ← normal row
│ [🏢] Delta Inc                      │
│ ...                                 │
├─────────────────────────────────────┤
│         ◀ 1 2 3 ... 16 ▶            │
└─────────────────────────────────────┘
```

**Row States:**
- Normal: Icon + name, [+] appears on hover
- In Graph: Dimmed text, [✓] icon, not clickable/draggable

### Preview Mode Toast

```
┌──────────────────────────────────────────────────────────────────┐
│ 👁 Live Preview: Showing connections for "John Smith"   [Dismiss]│
└──────────────────────────────────────────────────────────────────┘
```

- Position: Bottom center of workspace
- Persistent until preview is dismissed
- Shows source entity name for context

## Disabled Features During Preview

| Feature | Status |
|---------|--------|
| Multi-select (Ctrl+Click) | Disabled |
| Rectangle selection | Disabled |
| Node click (selection change) | Disabled |
| Double-click entity popup | Disabled |
| Right-click context menu | Disabled |
| Node dragging | Disabled |
| Zoom (Ctrl+Wheel) | **Enabled** |
| Pan (Ctrl+Drag) | **Enabled** |
| Zoom buttons (+/-/Fit) | **Enabled** |

## Architecture

### Design Principles

1. **Stateless preview components** - All preview components receive props, no internal state
2. **State lives in workspace.component.tsx** - Via `useGraphPreview` hook
3. **Minimal interface to workspace-graph** - Only `isPreviewActive` and `onAltClick`
4. **Preview layer as sibling** - Not embedded in D3 simulation
5. **Clean separation of concerns** - Each file has single responsibility

### Data Flow

```
workspace.component.tsx (state owner)
├── useGraphPreview hook (manages all preview state)
│   ├── isActive, sourceEntityId, entities, groups
│   ├── handleAltClick(), handleAddEntity(), handleExit()
│
├── workspace-graph.component.tsx (D3 rendering)
│   ├── Receives: isPreviewActive, onAltClick
│   ├── Detects Alt+Click, emits event with position
│   └── Disables conflicting interactions when preview active
│
├── graph-preview-layer.component.tsx (preview rendering)
│   ├── Receives: preview state, transform, source position
│   ├── Renders: preview nodes OR grouped nodes
│   └── Handles: hover states, add actions
│
├── graph-preview-popup.component.tsx (grouped entity list)
│   ├── Receives: entities, entitiesInGraph, callbacks
│   └── Renders: paginated list with compact entity cards
│
└── Preview toast (bottom notification)
    └── Shows mode indicator with dismiss button
```

### Props Interface

**workspace-graph.component.tsx receives:**
```typescript
interface WorkspaceGraphProps {
  // ... existing props
  isPreviewActive: boolean;
  onAltClick: (entityId: string, position: { x: number; y: number }) => void;
}
```

**Stateless preview components receive:**
```typescript
// graph-preview-node.component.tsx
interface GraphPreviewNodeProps {
  entity: Entity;
  position: { x: number; y: number };
  onAdd: (entity: Entity) => void;
}

// graph-preview-group.component.tsx
interface GraphPreviewGroupProps {
  entityType: string;
  count: number;
  position: { x: number; y: number };
  onClick: () => void;
}

// graph-preview-popup.component.tsx
interface GraphPreviewPopupProps {
  entityType: string;
  entities: Entity[];
  entitiesInGraph: Set<string>;
  position: { x: number; y: number };
  onAdd: (entity: Entity) => void;
  onClose: () => void;
}
```

## File Structure

### New Files

```
src/features/workspace/
├── components/
│   ├── graph-preview-layer.component.tsx      # Orchestrates preview rendering
│   ├── graph-preview-node.component.tsx       # Individual dashed preview node
│   ├── graph-preview-group.component.tsx      # Circular grouped summary node
│   └── graph-preview-popup.component.tsx      # Paginated entity list popup
│
└── hooks/
    └── useGraphPreview.ts                     # Preview state & logic
```

### Modified Files

```
src/features/workspace/
├── const.ts                                   # Add PREVIEW_THRESHOLD = 50
├── types.ts                                   # Add preview-related types
└── components/
    ├── workspace.component.tsx                # Add useGraphPreview, pass props
    └── workspace-graph.component.tsx          # Add Alt+Click handler, disable features

src/features/entity-card/components/
└── entity-card.component.tsx                  # Add variant="compact" prop

scripts/
└── seed-data (or similar)                     # Update relationship counts
```

## Seed Data Requirements

For testing all display modes:

| Entity Name Prefix | Relationship Count | Purpose |
|--------------------|-------------------|---------|
| A... | 5-10 | Test minimal preview |
| B... | 20-30 | Test moderate preview |
| C... | 30-49 | Test near-threshold |
| Z... | 100+ | Test grouped summary mode |

## Implementation Notes

### Performance Considerations

- Reuse existing expand API for fetching related entities
- Lazy load popup content (don't fetch until group is clicked)
- Debounce search input in popup
- Virtualize list if needed for very large groups

### Accessibility

- Toast announces preview mode to screen readers
- Escape key always exits preview
- Focus management when popup opens/closes

### Future Enhancements (Out of Scope)

- Multi-hop preview (2+)
- Preview filtering by entity type
- Keyboard navigation through preview nodes
- Preview history/undo
