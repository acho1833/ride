'use client';

/**
 * Detail Popup Component
 *
 * A draggable popup with a dedicated drag handle in the header.
 * Content is passed via children. Positioned absolutely using container-relative coordinates.
 * Uses React.memo to prevent re-renders when position hasn't changed.
 *
 * During drag: popup moves via direct DOM manipulation (no re-renders)
 * On drop: calls onDragEnd with final position so parent can convert to SVG coords
 */

import { memo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';

interface Props {
  x: number; // Container-relative x coordinate
  y: number; // Container-relative y coordinate
  onClose: () => void;
  onDragEnd: (containerX: number, containerY: number) => void; // Called on drop with final position
  header: React.ReactNode; // Header content (icon + title)
  children?: React.ReactNode; // Optional body content
}

const DetailPopupComponent = memo(({ x, y, onClose, onDragEnd, header, children }: Props) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 }); // Initial pointer position on drag start

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      // Offset = current pointer position - initial pointer position
      const offsetX = e.clientX - dragStartRef.current.x;
      const offsetY = e.clientY - dragStartRef.current.y;

      // Update DOM directly (no re-render)
      if (popupRef.current) {
        popupRef.current.style.left = `${x + offsetX}px`;
        popupRef.current.style.top = `${y + offsetY}px`;
      }
    },
    [x, y]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      isDraggingRef.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      // Final offset = current pointer position - initial pointer position
      const offsetX = e.clientX - dragStartRef.current.x;
      const offsetY = e.clientY - dragStartRef.current.y;

      // On drop: tell parent the final position so it can convert to SVG coords
      onDragEnd(x + offsetX, y + offsetY);
    },
    [onDragEnd, x, y]
  );

  return (
    <div
      ref={popupRef}
      className="bg-popover text-popover-foreground absolute z-50 w-48 overflow-hidden rounded-md border shadow-md"
      style={{
        left: `${x}px`,
        top: `${y}px`
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-1 px-1">
        {/* Drag handle */}
        <div
          className="text-muted-foreground hover:text-foreground cursor-grab p-1 active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <GripVertical className="h-3 w-3" />
        </div>

        {/* Header content (icon + title) */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5">{header}</div>

        {/* Close button */}
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Optional body content */}
      {children && <div className="border-t px-2 py-1">{children}</div>}
    </div>
  );
});

DetailPopupComponent.displayName = 'DetailPopupComponent';

export default DetailPopupComponent;
