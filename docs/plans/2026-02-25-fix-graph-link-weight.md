# Fix Graph Link Weight to Reflect Actual Event Count

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make spreadline graph link colors/widths reflect the actual number of co-authored papers (events) between two entities in the selected time range.

**Architecture:** The fix is a one-line change at the data source: set each topology entry's `weight` to `1` instead of the entity's global paper count. The graph transform functions already sum weights per link pair, so `weight` will naturally equal the event count. Tests need updating to match.

**Tech Stack:** TypeScript, D3 threshold scale, Jest

---

### Task 1: Fix topology weight in spreadline-data.service.ts

**Files:**
- Modify: `src/features/spreadlines/server/services/spreadline-data.service.ts:339`

**Step 1: Change weight from `row.count` to `1`**

Change line 339 from:
```typescript
weight: row.count || 1
```
to:
```typescript
weight: 1
```

Each topology entry represents one paper (event). By setting weight to 1, when the graph transform sums weights for a (sourceId, targetId) pair, the result equals the actual number of co-authored papers between those two entities.

**Step 2: Remove the now-unused `row.count` computation**

Lines 254-259 compute `row.count` which is no longer used. Remove:
```typescript
// Count collaborations
const collab = network.filter(
  r => r.sourceId === (author === egoId ? firstAuthor : author) || r.targetId === (author === egoId ? firstAuthor : author)
);
const uniquePapers = new Set(collab.map(r => r.id));
row.count = uniquePapers.size;
```

This code was an O(n^2) operation that computed a global metric per row — removing it is both a correctness fix and a performance improvement.

### Task 2: Update test data to use weight=1

**Files:**
- Modify: `src/features/spreadlines/utils.test.ts`

**Step 1: Update `makeRawData` topology weights**

The test data currently uses arbitrary large weights (100, 200, 50, 300). Update to `weight: 1` per entry to match the new behavior where each topology entry = 1 event:

```typescript
topology: [
  { sourceId: 'ego', targetId: 'a1', time: '2020', weight: 1 },
  { sourceId: 'ego', targetId: 'a1', time: '2021', weight: 1 },
  { sourceId: 'ego', targetId: 'a2', time: '2020', weight: 1 },
  { sourceId: 'a1', targetId: 'a2', time: '2021', weight: 1 }
]
```

**Step 2: Update `makeRawDataWithCitations` topology weights**

Same change:

```typescript
topology: [
  { sourceId: 'ego', targetId: 'a1', time: '2020', weight: 1 },
  { sourceId: 'ego', targetId: 'a1', time: '2021', weight: 1 },
  { sourceId: 'ego', targetId: 'a2', time: '2020', weight: 1 },
  { sourceId: 'a1', targetId: 'a2', time: '2021', weight: 1 }
]
```

**Step 3: Update expected values in tests**

- `aggregates link weight across all topology entries`: ego↔a1 has 2 entries → `expect(egoA1!.weight).toBe(2)` (was 300)
- `computes totalCitations per node`: a1 appears in 3 links (ego↔a1 weight=2, a1↔a2 weight=1) → `expect(a1!.totalCitations).toBe(3)` (was 600)
- `aggregates link weight for a single time block`: ego↔a1 in 2020 has 1 entry → `expect(egoA1!.weight).toBe(1)` (was 100)
- `aggregates link weight across time range`: ego↔a1 across 2020+2021 has 2 entries → `expect(egoA1!.weight).toBe(2)` (was 300)

### Task 3: Run tests and verify

**Step 1: Run tests**

Run: `npm test -- --testPathPattern=spreadlines/utils`
Expected: All tests pass

### Task 4: Update link threshold constants

**Files:**
- Modify: `src/features/spreadlines/const.ts:125-131`

**Step 1: Adjust thresholds to be meaningful for event counts**

Current thresholds `[2, 4, 6, 10]` were designed for the inflated weight metric. With weight = event count, these thresholds are actually reasonable for distinguishing relationship strength:

| Events | Color | Meaning |
|--------|-------|---------|
| 1 | light brown | Single paper |
| 2-3 | light pink | Few papers |
| 4-5 | pink | Moderate |
| 6-9 | magenta | Strong |
| 10+ | purple | Very strong |

**No change needed.** The thresholds already make sense for event counts.

### Task 5: Build and verify

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

### Task 6: Commit

```bash
git add src/features/spreadlines/server/services/spreadline-data.service.ts src/features/spreadlines/utils.test.ts
git commit -m "fix(spreadlines): use actual event count for graph link weight"
```
