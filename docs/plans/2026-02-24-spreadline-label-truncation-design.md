# Spreadline Label Truncation Design

## Problem
Entity name labels in the spreadline visualization overlap with neighboring pill containers when names are long. This makes the visualization hard to read.

## Solution
Truncate all displayed entity names to a fixed character limit (12 chars) with ellipsis ("..."). Show full name on hover via SVG `<title>` tooltip.

## Changes

### 1. Add constant — `src/features/spreadlines/const.ts`
- Add `SPREADLINE_LABEL_MAX_CHARS = 12`

### 2. Truncate at data layer — `src/lib/spreadline/render.ts`
- Where line labels are computed: truncate `label` field to 12 chars + "...", keep `fullLabel` as original
- Where inline labels are computed: truncate `name` field, add `fullName` for tooltip

### 3. Add inline label tooltips — `src/lib/spreadline-viz/spreadline-visualizer.ts`
- Add `<title>` element to inline label groups showing full name on hover
- Line labels already have `<title>` tooltip — no change needed

## File Structure
- **Modified:** `src/features/spreadlines/const.ts`
- **Modified:** `src/lib/spreadline/render.ts`
- **Modified:** `src/lib/spreadline-viz/spreadline-visualizer.ts`
- **Modified:** `src/lib/spreadline-viz/spreadline-types.ts` (add `fullName` to `InlineLabel`)
