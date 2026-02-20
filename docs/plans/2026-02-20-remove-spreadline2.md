# Remove Spreadline 2 Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all spreadline2 feature code while preserving the original spreadline (spreadline 1) feature.

**Architecture:** Spreadline2 is a self-contained feature under `src/features/spreadline2/` with 4 integration points in the rest of the codebase. We remove those references first, then delete the feature directory.

**Tech Stack:** Next.js, TypeScript, ORPC

---

### Task 1: Remove spreadline2 from ORPC router

**Files:**
- Modify: `src/lib/orpc/router.ts:18,31`

**Step 1: Remove import and registration**

Remove line 18 (the import) and line 31 (the router registration entry `spreadline2: spreadline2Router`).

**Step 2: Verify no trailing comma issue**

Ensure the `spreadline: spreadlineRouter` line becomes the last entry (no trailing comma issues with `as const` or similar).

---

### Task 2: Remove spreadline2 from FILE_APPLICATIONS constant

**Files:**
- Modify: `src/const.ts:25`

**Step 1: Remove the spreadline2 entry**

Remove line 25: `{ id: 'spreadline2', label: 'Spreadline 2', extension: '.sl2', iconName: 'TrendingUp' }`

This automatically removes `'spreadline2'` from the `FileApplicationId` union type (inferred from `as const`).

---

### Task 3: Remove spreadline2 from editor content router

**Files:**
- Modify: `src/features/editor/components/editor-content.component.tsx:11,55-56`

**Step 1: Remove import and switch case**

Remove line 11 (the `Spreadline2TabComponent` import) and lines 55-56 (the `case 'sl2':` switch case). Files with `.sl2` extension will fall through to the "Unknown File Type" default.

---

### Task 4: Remove .sl2 from editor group full-height check

**Files:**
- Modify: `src/features/editor/components/editor-group.component.tsx:55`

**Step 1: Remove .sl2 check**

Remove line 55: `activeFile?.name.endsWith('.sl2');` and adjust the boolean expression so `.sl` is the last entry.

---

### Task 5: Delete the spreadline2 feature directory

**Step 1: Delete the directory**

```bash
rm -rf src/features/spreadline2/
```

This removes ~26 files including components, hooks, server routers/services, lib utilities, and constants.

---

### Task 6: Build verification

**Step 1: Run lint**

```bash
npm run lint
```

Expected: PASS with no errors related to spreadline2.

**Step 2: Run build**

```bash
npm run build
```

Expected: PASS. No broken imports or references.

**Step 3: Run tests**

```bash
npm test
```

Expected: PASS. Spreadline2 had no test files. Spreadline 1 tests should still pass.

---

### Task 7: Commit

```bash
git add -A
git commit -m "feat: remove spreadline2 feature"
```
