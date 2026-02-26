import { setDragCursor, clearDragCursor } from './drag-cursor';

describe('drag-cursor utilities', () => {
  afterEach(() => {
    clearDragCursor();
  });

  it('injects a style element with the given cursor', () => {
    setDragCursor('grabbing');
    const el = document.getElementById('drag-cursor-override');
    expect(el).not.toBeNull();
    expect(el!.textContent).toContain('grabbing');
  });

  it('reuses existing style element on repeated calls', () => {
    setDragCursor('grabbing');
    setDragCursor('ew-resize');
    const elements = document.querySelectorAll('#drag-cursor-override');
    expect(elements.length).toBe(1);
    expect(elements[0].textContent).toContain('ew-resize');
  });

  it('removes the style element on clear', () => {
    setDragCursor('grabbing');
    clearDragCursor();
    expect(document.getElementById('drag-cursor-override')).toBeNull();
  });

  it('clearDragCursor is safe to call when no element exists', () => {
    expect(() => clearDragCursor()).not.toThrow();
  });
});
