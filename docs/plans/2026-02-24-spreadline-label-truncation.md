# Spreadline Label Truncation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Truncate entity name labels to 12 characters with ellipsis to prevent overlap, with full-name tooltip on hover.

**Architecture:** Add a character limit constant, truncate label text at the data layer in `render.ts`, and add `<title>` tooltips for inline labels in the visualizer. Line labels already have tooltip support.

**Tech Stack:** D3.js SVG rendering, TypeScript

---

### Task 1: Add truncation constant

**Files:**
- Modify: `src/features/spreadlines/const.ts:131` (append after existing constants)

**Step 1: Add the constant**

Add after line 66 (after `SPREADLINE_TIME_CONFIG`):

```typescript
/** Maximum characters for entity name labels before truncation */
export const SPREADLINE_LABEL_MAX_CHARS = 12;
```

**Step 2: Commit**

```bash
git add src/features/spreadlines/const.ts
git commit -m "feat(spreadline): add label max chars constant"
```

---

### Task 2: Add `fullName` to InlineLabel type

**Files:**
- Modify: `src/lib/spreadline-viz/spreadline-types.ts:111-115`

**Step 1: Add fullName field**

Change the `InlineLabel` interface to:

```typescript
export interface InlineLabel {
  name: string;
  fullName: string;
  posX: number;
  posY: number;
}
```

**Step 2: Commit**

```bash
git add src/lib/spreadline-viz/spreadline-types.ts
git commit -m "feat(spreadline): add fullName to InlineLabel type"
```

---

### Task 3: Truncate labels in render.ts

**Files:**
- Modify: `src/lib/spreadline/render.ts:507-522` (line labels)
- Modify: `src/lib/spreadline/render.ts:718-728` (inline labels)

**Step 1: Add import and truncation helper**

Add import at top of file:

```typescript
import { SPREADLINE_LABEL_MAX_CHARS } from '@/features/spreadlines/const';
```

Add a local helper function (private method or module-level):

```typescript
function truncateLabel(name: string, max: number): string {
  return name.length > max ? name.slice(0, max) + '...' : name;
}
```

**Step 2: Truncate line labels (around line 514)**

Change:

```typescript
update.label = {
  posX: lineStart[0][0] - dx,
  posY: lineStart[1],
  textAlign: 'end',
  line: `M${toSvgJoin([lineStart[0][0] - dxOffset, lineStart[1]])} L${toSvgJoin([lineStart[0][0] - markOffset, lineStart[1]])}`,
  label: name,
  fullLabel: name,
  visibility: 'visible'
};
```

To:

```typescript
update.label = {
  posX: lineStart[0][0] - dx,
  posY: lineStart[1],
  textAlign: 'end',
  line: `M${toSvgJoin([lineStart[0][0] - dxOffset, lineStart[1]])} L${toSvgJoin([lineStart[0][0] - markOffset, lineStart[1]])}`,
  label: truncateLabel(name, SPREADLINE_LABEL_MAX_CHARS),
  fullLabel: name,
  visibility: 'visible'
};
```

**Step 3: Truncate inline labels (around line 723)**

Change:

```typescript
result.push({
  posX: (mark[0][0] + mark[0][1]) / 2,
  posY: mark[1],
  name
});
```

To:

```typescript
result.push({
  posX: (mark[0][0] + mark[0][1]) / 2,
  posY: mark[1],
  name: truncateLabel(name, SPREADLINE_LABEL_MAX_CHARS),
  fullName: name
});
```

**Step 4: Run build to verify no type errors**

Run: `npm run build`
Expected: PASS (no type errors)

**Step 5: Commit**

```bash
git add src/lib/spreadline/render.ts
git commit -m "feat(spreadline): truncate line and inline labels to 12 chars"
```

---

### Task 4: Add tooltip to inline labels in visualizer

**Files:**
- Modify: `src/lib/spreadline-viz/spreadline-visualizer.ts:790-819`

**Step 1: Add `<title>` to inline label foreground group**

After the inline labels foreground block (around line 819), the inline labels are rendered as individual `<text>` elements. We need to append a `<title>` child to each one. The simplest way: after the foreground text join, append title.

Find the foreground inline label block and add `.append('title').text(e => e.fullName)` after the text content is set. Specifically, modify the foreground block to wrap each text in a `<g>` or just append `<title>` to the text selection.

SVG `<title>` can be a child of `<text>`, so append directly:

After line 819 (after the foreground inline labels `.attr('dy', '4px')`), the D3 selection still refers to the text elements. We need to capture the selection and append title. Change:

```typescript
// Inline labels foreground
container
  .append('g')
  .attr('fill', d => d.color)
  .selectAll('text')
  .data(d => d.inlineLabels)
  .join('text')
  .attr('class', 'text-display stroked-text movable labels inline-labels')
  .attr('transform', 'translate(0, 0)')
  .text(e => e.name)
  .attr('x', e => e.posX)
  .attr('y', e => e.posY)
  .style('text-anchor', 'middle')
  .attr('dy', '4px');
```

To:

```typescript
// Inline labels foreground
container
  .append('g')
  .attr('fill', d => d.color)
  .selectAll('text')
  .data(d => d.inlineLabels)
  .join('text')
  .attr('class', 'text-display stroked-text movable labels inline-labels')
  .attr('transform', 'translate(0, 0)')
  .text(e => e.name)
  .attr('x', e => e.posX)
  .attr('y', e => e.posY)
  .style('text-anchor', 'middle')
  .attr('dy', '4px')
  .append('title')
  .text(e => e.fullName);
```

**Step 2: Run build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/spreadline-viz/spreadline-visualizer.ts
git commit -m "feat(spreadline): add tooltip to inline labels showing full name"
```

---

### Task 5: Visual verification

**Step 1:** Open the spreadline visualization in browser
**Step 2:** Verify labels are truncated to ~12 chars with "..."
**Step 3:** Hover over truncated labels — verify full name shows in tooltip
**Step 4:** Check both line labels (entry points) and inline labels (inside pills)
