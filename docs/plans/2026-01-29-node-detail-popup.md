# Node Detail Popup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add double-click popup functionality to workspace-graph nodes showing entity details (labelNormalized and type icon).

**Architecture:**
- SVG `<g>` elements act as position anchors (created on double-click, updated on drag)
- React reads screen coords from `<g>` via `getBoundingClientRect()` on each render
- Local state stores only `{ id, entityId }` — the `<g>` element holds the position
- `DetailPopupComponent` handles drag logic; `EntityDetailPopupComponent` provides content via children

**Tech Stack:** React, D3.js, useState, Shadcn Card, Lucide icons, native pointer events for drag

---

## Task 1: Create Detail Popup Component (Generic)

**Files:**
- Create: `src/features/workspace/components/detail-popup.component.tsx`

**Step 1: Create the generic popup component**

`src/features/workspace/components/detail-popup.component.tsx`:
```typescript
'use client';

/**
 * Detail Popup Component
 *
 * A generic draggable popup shell with drag handle and close button.
 * Content is passed via children. Positioned absolutely using screen coordinates.
 * Uses React.memo to prevent re-renders when position hasn't changed.
 *
 * During drag: popup moves via direct DOM manipulation (no re-renders)
 * On drop: calls onDragEnd with final screen x, y so parent can convert to SVG coords
 */

import { memo, useCallback, useRef } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';

interface Props {
  x: number;  // Screen x coordinate
  y: number;  // Screen y coordinate
  onClose: () => void;
  onDragEnd: (screenX: number, screenY: number) => void;  // Called on drop with final screen position
  children: React.ReactNode;
}

const DetailPopupComponent = memo(({ x, y, onClose, onDragEnd, children }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });  // Initial pointer position on drag start

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    // Offset = current pointer position - initial pointer position
    const offsetX = e.clientX - dragStartRef.current.x;
    const offsetY = e.clientY - dragStartRef.current.y;

    // Update DOM directly (no re-render)
    if (cardRef.current) {
      cardRef.current.style.left = `${x + offsetX}px`;
      cardRef.current.style.top = `${y + offsetY}px`;
    }
  }, [x, y]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Final offset = current pointer position - initial pointer position
    const offsetX = e.clientX - dragStartRef.current.x;
    const offsetY = e.clientY - dragStartRef.current.y;

    // On drop: tell parent the final screen position so it can convert to SVG coords
    onDragEnd(x + offsetX, y + offsetY);
  }, [onDragEnd, x, y]);

  return (
    <Card
      ref={cardRef}
      className="absolute z-50 shadow-lg"
      style={{
        left: `${x}px`,
        top: `${y}px`
      }}
    >
      <CardHeader className="flex flex-row items-center gap-2 border-b p-3">
        {/* Drag handle */}
        <div
          className="cursor-grab text-muted-foreground hover:text-foreground"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Content passed as children */}
        {children}

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
    </Card>
  );
});

DetailPopupComponent.displayName = 'DetailPopupComponent';

export default DetailPopupComponent;
```

---

## Task 2: Create Entity Detail Content Component

**Files:**
- Create: `src/features/workspace/components/entity-detail-content.component.tsx`

**Step 1: Create the entity content component (no position/drag logic)**

`src/features/workspace/components/entity-detail-content.component.tsx`:
```typescript
'use client';

/**
 * Entity Detail Content Component
 *
 * Displays entity details (icon and labelNormalized).
 * Pure content component — no position or drag logic.
 * Used as children inside DetailPopupComponent.
 */

import { CardTitle } from '@/components/ui/card';
import { ENTITY_ICON_CONFIG, DEFAULT_ENTITY_ICON } from '@/const';
import type { Entity } from '@/models/entity.model';

interface Props {
  entity: Entity;
}

const EntityDetailContentComponent = ({ entity }: Props) => {
  const iconConfig = ENTITY_ICON_CONFIG[entity.type] ?? DEFAULT_ENTITY_ICON;

  return (
    <>
      <i className={`${iconConfig.cssClass} text-lg`} />
      <CardTitle className="flex-1 truncate text-sm font-medium">
        {entity.labelNormalized}
      </CardTitle>
    </>
  );
};

export default EntityDetailContentComponent;
```

**Step 2: Verify build passes**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/features/workspace/components/detail-popup.component.tsx src/features/workspace/components/entity-detail-content.component.tsx
git commit -m "feat(workspace): create detail popup components"
```

---

## Task 3: Add Popup State and SVG Anchors to WorkspaceGraphComponent

**Files:**
- Modify: `src/features/workspace/components/workspace-graph.component.tsx`

**Step 1: Add PopupState interface at top of file**

`src/features/workspace/components/workspace-graph.component.tsx` (add after existing imports):
```typescript
/**
 * Represents an open popup in the workspace graph.
 * Position is stored in the SVG <g> element, not in state.
 * ID format: 'workspace-graph-popup-{entityId}'
 */
interface PopupState {
  id: string;
  entityId: string;
}
```

**Step 2: Add imports**

`src/features/workspace/components/workspace-graph.component.tsx` (add to imports section):
```typescript
import DetailPopupComponent from './detail-popup.component';
import EntityDetailContentComponent from './entity-detail-content.component';
```

**Step 3: Add popup state inside component**

`src/features/workspace/components/workspace-graph.component.tsx` (add inside WorkspaceGraphComponent, after existing refs):
```typescript
// Local state for open popups - position stored in SVG <g> elements
const [openPopups, setOpenPopups] = useState<PopupState[]>([]);
```

**Step 4: Add helper function to get screen coords from SVG anchor**

`src/features/workspace/components/workspace-graph.component.tsx` (add after popup state):
```typescript
/**
 * Gets screen coordinates for a popup by reading its SVG <g> anchor element.
 * Returns null if element not found.
 */
const getPopupScreenPosition = useCallback((popupId: string): { x: number; y: number } | null => {
  const gElement = svgRef.current?.querySelector(`#${popupId}`);
  if (!gElement) return null;
  const rect = gElement.getBoundingClientRect();
  return { x: rect.left, y: rect.top };
}, []);
```

**Step 5: Add popup action handlers**

`src/features/workspace/components/workspace-graph.component.tsx` (add after getPopupScreenPosition):
```typescript
/**
 * Opens a popup for an entity at its node's lower-right corner.
 * Creates SVG <g> anchor element and adds to state.
 */
const handleOpenPopup = useCallback((entityId: string, nodeX: number, nodeY: number) => {
  const popupId = `workspace-graph-popup-${entityId}`;

  // Don't add if already exists
  if (openPopups.some(p => p.id === popupId)) return;

  // Create SVG <g> anchor at lower-right of node
  const g = d3.select(svgRef.current).select('g');
  const anchorX = nodeX + GRAPH_CONFIG.nodeRadius;
  const anchorY = nodeY + GRAPH_CONFIG.nodeRadius;

  g.append('g')
    .attr('id', popupId)
    .attr('class', 'popup-anchor')
    .attr('transform', `translate(${anchorX}, ${anchorY})`);

  setOpenPopups(prev => [...prev, { id: popupId, entityId }]);
}, [openPopups]);

/**
 * Closes a popup by ID. Removes SVG anchor element.
 */
const handleClosePopup = useCallback((popupId: string) => {
  // Remove SVG anchor
  d3.select(svgRef.current).select(`#${popupId}`).remove();
  setOpenPopups(prev => prev.filter(p => p.id !== popupId));
}, []);

/**
 * Updates popup position on drag end.
 * Converts final screen position to SVG coordinates and updates the <g> transform.
 * Called once when user releases the drag.
 */
const handlePopupDragEnd = useCallback((popupId: string, screenX: number, screenY: number) => {
  const gElement = svgRef.current?.querySelector(`#${popupId}`);
  const containerRect = containerRef.current?.getBoundingClientRect();
  if (!gElement || !containerRect) return;

  const transform = transformRef.current;
  // Convert screen coords to SVG coords (inverse of getBoundingClientRect transform)
  const svgX = (screenX - containerRect.left - transform.x) / transform.k;
  const svgY = (screenY - containerRect.top - transform.y) / transform.k;

  // Update <g> transform to new SVG position
  gElement.setAttribute('transform', `translate(${svgX}, ${svgY})`);

  // Force re-render to sync popup with new <g> position
  setOpenPopups(prev => [...prev]);
}, []);
```

**Step 6: Add double-click handler on nodes (inside D3 useEffect)**

`src/features/workspace/components/workspace-graph.component.tsx` (inside D3 useEffect, after node click handlers around line 420):
```typescript
// Double-click on node: open entity detail popup
node.on('dblclick', function (event: MouseEvent, d: WorkspaceGraphNode) {
  event.preventDefault();
  event.stopPropagation();
  // Open popup at node's lower-right corner
  handleOpenPopup(d.id, d.x ?? 0, d.y ?? 0);
});
```

**Step 7: Update popup positions on pan/zoom**

`src/features/workspace/components/workspace-graph.component.tsx` (inside zoom.on('zoom', ...) handler around line 215, after `debouncedSave()`):
```typescript
// Inside zoom.on('zoom', ...) handler, after applying transform:
// Force re-render to update popup screen positions from SVG anchors
setOpenPopups(prev => [...prev]);
```

**Step 8: Render popups in component return**

`src/features/workspace/components/workspace-graph.component.tsx` (in return statement, after SVG element around line 635):
```typescript
return (
  <div ref={containerRef} className="relative h-full w-full overflow-hidden" ...>
    <svg ref={svgRef} className="h-full w-full select-none" />

    {/* Render entity detail popups */}
    {openPopups.map(popup => {
      const entity = entityMap.get(popup.entityId);
      const screenPos = getPopupScreenPosition(popup.id);
      if (!entity || !screenPos) return null;

      return (
        <DetailPopupComponent
          key={popup.id}
          x={screenPos.x}
          y={screenPos.y}
          onClose={() => handleClosePopup(popup.id)}
          onDragEnd={(screenX, screenY) => handlePopupDragEnd(popup.id, screenX, screenY)}
        >
          <EntityDetailContentComponent entity={entity} />
        </DetailPopupComponent>
      );
    })}

    {/* Control buttons - lower right */}
    <div className="absolute right-4 bottom-4 flex flex-col gap-2">
      ...
    </div>
  </div>
);
```

**Step 9: Cleanup SVG anchors on unmount or data change**

`src/features/workspace/components/workspace-graph.component.tsx` (in D3 useEffect cleanup around line 555):
```typescript
return () => {
  // ... existing cleanup
  // Remove popup anchors
  d3.select(svgRef.current).selectAll('.popup-anchor').remove();
  setOpenPopups([]);
};
```

**Step 10: Add handleOpenPopup to D3 useEffect dependencies**

`src/features/workspace/components/workspace-graph.component.tsx` (D3 useEffect dependency array around line 557):
```typescript
}, [...existingDeps, handleOpenPopup]);
```

**Step 11: Verify build passes**

Run: `npm run build`

**Step 12: Commit**

```bash
git add src/features/workspace/components/workspace-graph.component.tsx
git commit -m "feat(workspace): add popup state with SVG anchors to workspace graph"
```

---

## Task 4: Verification & Testing

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test double-click popup**

1. Open a `.ws` file with entities
2. Double-click on a node
3. Verify popup appears at lower-right of node with entity icon and labelNormalized

**Step 3: Test multiple popups**

1. Double-click on different nodes
2. Verify multiple popups can be open simultaneously
3. Double-click same node again - verify no duplicate popup

**Step 4: Test drag**

1. Drag the popup via the grip handle
2. Verify popup moves smoothly
3. Release - verify popup stays at new position

**Step 5: Test pan/zoom**

1. With popup(s) open, pan the graph (Ctrl+drag)
2. Verify popups move with the graph
3. Zoom in/out (Ctrl+scroll)
4. Verify popups scale position correctly

**Step 6: Test close**

1. Click X button on popup
2. Verify popup closes

**Step 7: Final commit**

```bash
git add -A
git commit -m "feat(workspace): complete entity detail popup feature"
```

---

## File Summary

| File | Action |
|------|--------|
| `src/features/workspace/components/detail-popup.component.tsx` | Create - generic draggable popup shell |
| `src/features/workspace/components/entity-detail-content.component.tsx` | Create - entity content (icon + label) |
| `src/features/workspace/components/workspace-graph.component.tsx` | Modify - add popup state, SVG anchors, handlers |

## Architecture Summary

**State Management:**
- Local `useState` in WorkspaceGraphComponent
- State stores `{ id, entityId }` only — no coordinates
- SVG `<g>` elements hold position as `transform` attribute

**Position Handling:**
- SVG `<g>` anchor created on double-click at node's lower-right corner
- `getPopupScreenPosition()` reads `getBoundingClientRect()` from `<g>` element
- Pan/zoom automatically moves `<g>` (via parent group transform)
- Force re-render via `setOpenPopups(prev => [...prev])` to read new screen coords

**Drag Handling:**
- During drag: popup moves via direct DOM manipulation using `useRef` (zero re-renders)
- On drop: parent receives final screen position, converts to SVG coordinates, updates `<g>` transform
- Single re-render on drop to sync popup with new `<g>` position

**Performance:**
- `React.memo` on popup components
- Only re-renders if props change
- SVG handles position math; React just reads final screen coords
