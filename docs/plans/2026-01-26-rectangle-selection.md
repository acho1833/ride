# Rectangle Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add rectangle/box selection to workspace-graph - left-click + drag on canvas selects all entities inside the rectangle.

**Architecture:** Add mouse event handlers (mousedown/mousemove/mouseup) to the SVG element that track drag state and draw a selection rectangle. On release, find all nodes whose center point is inside the rectangle and update selection.

**Tech Stack:** D3.js, React refs, existing `screenToSvgCoords()` utility

---

### Task 1: Add Selection Constants

**Files:**
- Modify: `src/features/workspace/const.ts:33` (after GRAPH_CONFIG)

**Step 1: Add SELECTION_CONFIG constant**

Add after line 33 (after closing `GRAPH_CONFIG`):

```typescript
/**
 * Rectangle selection configuration.
 */
export const SELECTION_CONFIG = {
  /** Minimum drag distance in pixels to trigger rectangle selection vs click */
  minDragDistance: 5,
  /** Selection rectangle fill color (semi-transparent blue) */
  rectFill: 'rgba(59, 130, 246, 0.2)',
  /** Selection rectangle stroke color */
  rectStroke: 'rgba(59, 130, 246, 0.8)',
  /** Selection rectangle stroke width */
  rectStrokeWidth: 1,
  /** Selection rectangle stroke dash pattern */
  rectStrokeDash: '4,2'
} as const;
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/features/workspace/const.ts
git commit -m "feat(workspace): add rectangle selection config constants"
```

---

### Task 2: Add Helper Function and Refs

**Files:**
- Modify: `src/features/workspace/components/workspace-graph.component.tsx`

**Step 1: Update import to include SELECTION_CONFIG**

Change line 16 from:
```typescript
import { GRAPH_CONFIG } from '../const';
```

To:
```typescript
import { GRAPH_CONFIG, SELECTION_CONFIG } from '../const';
```

**Step 2: Add helper function after `calculateFitTransform` (after line 65)**

```typescript
/**
 * Check if a point is inside a rectangle.
 */
function isPointInRect(
  x: number,
  y: number,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}
```

**Step 3: Add refs for rectangle selection state (after line 106, after `selectedEntityIdsRef`)**

```typescript
  // Rectangle selection state refs
  const isDraggingSelectionRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; screenX: number; screenY: number } | null>(null);
  const justCompletedDragRef = useRef(false);
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 5: Commit**

```bash
git add src/features/workspace/components/workspace-graph.component.tsx
git commit -m "feat(workspace): add rectangle selection helper and refs"
```

---

### Task 3: Create Selection Rectangle SVG Element

**Files:**
- Modify: `src/features/workspace/components/workspace-graph.component.tsx`

**Step 1: Add selection rectangle element after the nodes group**

Find line 264 (after node labels, before `// Setup force simulation`):
```typescript
      .attr('pointer-events', 'none');
```

Add after it (before `// Setup force simulation` comment on line 266):

```typescript

    // Create selection rectangle (initially hidden, rendered on top of nodes)
    const selectionRect = g
      .append('rect')
      .attr('class', 'selection-rect')
      .attr('fill', SELECTION_CONFIG.rectFill)
      .attr('stroke', SELECTION_CONFIG.rectStroke)
      .attr('stroke-width', SELECTION_CONFIG.rectStrokeWidth)
      .attr('stroke-dasharray', SELECTION_CONFIG.rectStrokeDash)
      .attr('pointer-events', 'none')
      .attr('visibility', 'hidden');
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/features/workspace/components/workspace-graph.component.tsx
git commit -m "feat(workspace): add selection rectangle SVG element"
```

---

### Task 4: Implement Rectangle Selection Mouse Handlers

**Files:**
- Modify: `src/features/workspace/components/workspace-graph.component.tsx`

**Step 1: Replace the existing SVG click handler with full mouse event handling**

Find lines 400-403:
```typescript
    // Click on empty canvas: clear selection
    svg.on('click', function () {
      onClearEntitySelection();
    });
```

Replace with the complete rectangle selection implementation:

```typescript
    // Rectangle selection: track drag state for mousedown/mousemove/mouseup
    svg.on('mousedown', function (event: MouseEvent) {
      // Only handle left-click
      if (event.button !== 0) return;

      // Check if clicked on a node (not empty canvas)
      const target = event.target as Element;
      if (target.closest('.nodes g')) return;

      // Store start position in both screen and graph coordinates
      const graphCoords = screenToSvgCoords(event.clientX, event.clientY, svgRef.current!, transformRef.current);
      dragStartRef.current = {
        x: graphCoords.x,
        y: graphCoords.y,
        screenX: event.clientX,
        screenY: event.clientY
      };
      isDraggingSelectionRef.current = false;
    });

    svg.on('mousemove', function (event: MouseEvent) {
      if (!dragStartRef.current) return;

      // Calculate screen distance moved
      const dx = event.clientX - dragStartRef.current.screenX;
      const dy = event.clientY - dragStartRef.current.screenY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Start rectangle selection if moved past threshold
      if (!isDraggingSelectionRef.current && distance >= SELECTION_CONFIG.minDragDistance) {
        isDraggingSelectionRef.current = true;
        selectionRect.attr('visibility', 'visible');
      }

      // Update rectangle if actively dragging
      if (isDraggingSelectionRef.current) {
        const currentCoords = screenToSvgCoords(event.clientX, event.clientY, svgRef.current!, transformRef.current);

        // Calculate rectangle bounds (handle drag in any direction)
        const rectX = Math.min(dragStartRef.current.x, currentCoords.x);
        const rectY = Math.min(dragStartRef.current.y, currentCoords.y);
        const rectWidth = Math.abs(currentCoords.x - dragStartRef.current.x);
        const rectHeight = Math.abs(currentCoords.y - dragStartRef.current.y);

        selectionRect
          .attr('x', rectX)
          .attr('y', rectY)
          .attr('width', rectWidth)
          .attr('height', rectHeight);
      }
    });

    svg.on('mouseup', function (event: MouseEvent) {
      if (!dragStartRef.current) return;

      const wasDragging = isDraggingSelectionRef.current;

      if (wasDragging) {
        // Complete rectangle selection
        const currentCoords = screenToSvgCoords(event.clientX, event.clientY, svgRef.current!, transformRef.current);

        const rectX = Math.min(dragStartRef.current.x, currentCoords.x);
        const rectY = Math.min(dragStartRef.current.y, currentCoords.y);
        const rectWidth = Math.abs(currentCoords.x - dragStartRef.current.x);
        const rectHeight = Math.abs(currentCoords.y - dragStartRef.current.y);

        // Find all nodes inside the rectangle
        const nodesInRect = nodes.filter(n =>
          isPointInRect(n.x ?? 0, n.y ?? 0, { x: rectX, y: rectY, width: rectWidth, height: rectHeight })
        );
        const selectedIds = nodesInRect.map(n => n.id);

        // Update selection
        onSetSelectedEntityIds(selectedIds);

        // Hide rectangle
        selectionRect.attr('visibility', 'hidden');

        // Prevent click handler from firing
        justCompletedDragRef.current = true;
        setTimeout(() => {
          justCompletedDragRef.current = false;
        }, 0);
      }

      // Reset drag state
      dragStartRef.current = null;
      isDraggingSelectionRef.current = false;
    });

    // Handle mouse leaving SVG during drag
    svg.on('mouseleave', function () {
      if (isDraggingSelectionRef.current) {
        // Cancel rectangle selection
        selectionRect.attr('visibility', 'hidden');
        dragStartRef.current = null;
        isDraggingSelectionRef.current = false;
      }
    });

    // Click on empty canvas: clear selection (only if not completing a drag)
    svg.on('click', function () {
      if (justCompletedDragRef.current) return;
      onClearEntitySelection();
    });
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/features/workspace/components/workspace-graph.component.tsx
git commit -m "feat(workspace): implement rectangle selection mouse handlers"
```

---

### Task 5: Manual Verification

**Step 1: Start development server**

Run: `npm run dev`

**Step 2: Test rectangle selection**

1. Open a workspace with multiple entities
2. Left-click + drag on empty canvas → blue rectangle should appear
3. Release → entities inside rectangle should be selected (highlighted blue)
4. Verify: quick click on canvas (< 5px drag) → selection clears

**Step 3: Test existing behaviors unchanged**

1. Click on a node → single select works
2. Ctrl+click on node → toggle selection works
3. Drag on a node → node moves
4. Ctrl+drag on canvas → pans graph
5. Ctrl+wheel → zooms graph

**Step 4: Test edge cases**

1. Mouse leaves SVG during drag → rectangle disappears, no selection change
2. Rectangle with no nodes inside → selection becomes empty
3. Rectangle selection while zoomed/panned → coordinates correct

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(workspace): complete rectangle selection feature"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add selection constants | `const.ts` |
| 2 | Add helper function and refs | `workspace-graph.component.tsx` |
| 3 | Create selection rectangle SVG element | `workspace-graph.component.tsx` |
| 4 | Implement mouse event handlers | `workspace-graph.component.tsx` |
| 5 | Manual verification | - |
