const DRAG_CURSOR_STYLE_ID = 'drag-cursor-override';

/** Inject a global cursor style to override element-level cursors during drag */
export function setDragCursor(cursor: string): void {
  let el = document.getElementById(DRAG_CURSOR_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = DRAG_CURSOR_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = `* { cursor: ${cursor} !important; }`;
}

/** Remove the global drag cursor override */
export function clearDragCursor(): void {
  document.getElementById(DRAG_CURSOR_STYLE_ID)?.remove();
}
