# Spreadline HTML Legend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the spreadline legends from the D3/SVG canvas into the React toolbar as HTML elements, positioned inline after the ego info.

**Architecture:** Suppress SVG legends via config, expose toggle methods from the D3 visualizer through the chart handle, and add clickable HTML legend swatches to the toolbar.

**Tech Stack:** React, D3 (existing), Tailwind CSS, Shadcn/ui

---

### Task 1: Suppress SVG legends via config

**Files:**
- Modify: `src/features/spreadlines/components/spreadline.component.tsx:186-211` (config useMemo)
- Modify: `src/lib/spreadline-viz/spreadline-visualizer.ts:48` (_LEGEND_OFFSET)
- Modify: `src/lib/spreadline-viz/spreadline-visualizer.ts:932` (_drawNodeLegend)

**Step 1: Always pass empty line legend config**

In `spreadline.component.tsx`, change the `config` useMemo to always suppress the SVG line legend (not just when `splitByAffiliation` is false):

```tsx
const config = useMemo(
  () =>
    ({
      content: {
        customize: () => {},
        collisionDetection: true,
        showLinks: false
      },
      legend: {
        line: { domain: [] as string[], range: [] as string[], offset: [] as number[] }
      },
      ...(splitByAffiliation
        ? {}
        : {
            background: {
              direction: [] as string[],
              directionFontSize: '3rem',
              timeLabelFormat: (d: string) => d,
              annotations: [],
              timeHighlight: [] as string[],
              sliderTitle: 'Min Years'
            }
          })
    }) as Partial<SpreadLineConfig>,
  [splitByAffiliation]
);
```

**Step 2: Set _LEGEND_OFFSET to 0 when legend is empty**

In `spreadline-visualizer.ts` constructor (~line 82-91), after `this.config` is set, change:

```typescript
this._LEGEND_OFFSET = this.config.legend.line.domain.length > 0 ? 60 : 0;
```

**Step 3: Skip node legend when line legend is empty**

In `_drawNodeLegend()` (~line 932), add early return at the top:

```typescript
private _drawNodeLegend(): void {
  if (this.config.legend.line.domain.length === 0) return;
  // ... rest unchanged
}
```

**Step 4: Verify SVG renders without legends**

Run: `npm run build`
Expected: Build succeeds, no SVG legends rendered.

---

### Task 2: Expose toggle methods on chart handle

**Files:**
- Modify: `src/lib/spreadline-viz/spreadline-visualizer.ts` (add public methods)
- Modify: `src/lib/spreadline-viz/spreadline-chart.tsx:49-55` (SpreadLineChartHandle)
- Modify: `src/lib/spreadline-viz/spreadline-chart.tsx:167-195` (useImperativeHandle)

**Step 1: Add toggle methods to SpreadLinesVisualizer**

Add two public methods after `clearPins()` in `spreadline-visualizer.ts`:

```typescript
/** Toggle visibility of lines with the given color */
toggleLineVisibility(color: string): void {
  const lines = d3.selectAll('.line-filter')
    .filter((d: unknown) => (d as { color: string }).color === color);
  const isVisible = lines.style('visibility') !== 'hidden';
  lines.style('visibility', isVisible ? 'hidden' : 'visible');
}

/** Toggle visibility of all labels (except ego) */
toggleLabels(): void {
  const ego = this._EGO;
  const newStatus = this._HIDE_LABELS === 'hidden' ? 'revealed' : 'hidden';
  const labels = d3.selectAll('.labels,.mark-links')
    .filter((d: unknown) => (d as { name: string }).name !== ego);
  labels.style('visibility', newStatus === 'hidden' ? 'visible' : 'hidden');
  this._HIDE_LABELS = newStatus;
}
```

**Step 2: Add to SpreadLineChartHandle interface**

In `spreadline-chart.tsx`, extend the handle:

```typescript
export interface SpreadLineChartHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  getZoomLevel: () => number;
  clearPins: () => void;
  toggleLineVisibility: (color: string) => void;
  toggleLabels: () => void;
}
```

**Step 3: Wire through useImperativeHandle**

Add to the `useImperativeHandle` block:

```typescript
toggleLineVisibility: (color: string) => visualizerRef.current?.toggleLineVisibility(color),
toggleLabels: () => visualizerRef.current?.toggleLabels()
```

---

### Task 3: Add HTML legend to toolbar

**Files:**
- Modify: `src/features/spreadlines/components/spreadline.component.tsx:246-249` (after ego span)

**Step 1: Add state for legend toggles**

Add state variables near the existing filter state:

```tsx
const [hiddenColors, setHiddenColors] = useState<Set<string>>(new Set());
const [labelsVisible, setLabelsVisible] = useState(true);
```

**Step 2: Add legend HTML after ego info span**

After the ego info `<span>` (line 249), add:

```tsx
{splitByAffiliation && (
  <>
    <div className="bg-border h-4 w-px" />
    {Object.entries(SPREADLINE_CATEGORY_COLORS).map(([category, color]) => (
      <button
        key={category}
        className="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity"
        style={{ opacity: hiddenColors.has(color) ? 0.3 : undefined }}
        onClick={() => {
          chartRef.current?.toggleLineVisibility(color);
          setHiddenColors(prev => {
            const next = new Set(prev);
            if (next.has(color)) next.delete(color);
            else next.add(color);
            return next;
          });
        }}
      >
        <span
          className="inline-block h-3 w-3 rounded-sm border"
          style={{ backgroundColor: hiddenColors.has(color) ? 'transparent' : color, borderColor: color }}
        />
        <span className="capitalize">{category}</span>
      </button>
    ))}
    <button
      className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      onClick={() => {
        chartRef.current?.toggleLabels();
        setLabelsVisible(prev => !prev);
      }}
    >
      {labelsVisible ? 'Hide Labels' : 'Show Labels'}
    </button>
  </>
)}
```

**Step 3: Verify**

Run: `npm run build`
Expected: Build succeeds. Legend appears inline in toolbar after ego info when "Split by affiliation" is checked.

---

### Task 4: Build and lint

**Step 1:** Run `npm run build`
**Step 2:** Fix any lint/type errors
