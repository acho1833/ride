# View Settings Panel Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply view settings to control panel visibility - hide toolbar icons when disabled, unmount panels when all features in a position are disabled, auto-activate first enabled tool.

**Architecture:** View settings from Zustand store drive UI visibility. Selector hooks check enabled state per tool/position. Components filter icons and conditionally render panels.

**Tech Stack:** React, Zustand, TypeScript

---

## Task 1: Add mappings to view-settings.model.ts

**Files:**
- Modify: `src/models/view-settings.model.ts`

**Step 1: Add ToolType import and TOOLBAR_POSITIONS constant**

Add after line 18 (after `ToolbarPosition` type):

```typescript
/** Array of all toolbar positions for iteration */
export const TOOLBAR_POSITIONS: ToolbarPosition[] = ['left', 'right', 'bottom'];
```

**Step 2: Add VIEW_SETTING_TO_TOOL_TYPE mapping**

Add at end of file (before the interface/schema section):

```typescript
import { ToolType } from '@/features/toolbars/types';

/** Map ViewSettingKey to ToolType */
export const VIEW_SETTING_TO_TOOL_TYPE: Record<ViewSettingKey, ToolType> = {
  entitySearch: 'ENTITY_SEARCH',
  notification: 'ALERT',
  aiPrompt: 'PROMPT',
  charts: 'CHARTS'
};

/** Reverse mapping: ToolType to ViewSettingKey (for tools that have settings) */
export const TOOL_TYPE_TO_VIEW_SETTING: Partial<Record<ToolType, ViewSettingKey>> = {
  ENTITY_SEARCH: 'entitySearch',
  ALERT: 'notification',
  PROMPT: 'aiPrompt',
  CHARTS: 'charts'
  // FILES has no view setting - always visible
};
```

**Step 3: Verify no lint errors**

Run: `npm run lint`
Expected: No errors in view-settings.model.ts

**Step 4: Commit**

```bash
git add src/models/view-settings.model.ts
git commit -m "feat: add view setting to tool type mappings"
```

---

## Task 2: Add selector hooks to app-settings.selector.ts

**Files:**
- Modify: `src/stores/app-settings/app-settings.selector.ts`

**Step 1: Add imports**

Add to imports at top:

```typescript
import { ToolType } from '@/features/toolbars/types';
import {
  ViewSettingKey,
  DEFAULT_VIEW_SETTINGS,
  ToolbarPosition,
  VIEW_SETTINGS_CONFIG,
  TOOL_TYPE_TO_VIEW_SETTING
} from '@/models/view-settings.model';
```

**Step 2: Add useIsToolEnabled selector**

Add after `useViewSetting`:

```typescript
/** Check if a specific tool type is enabled (tools without settings return true) */
export const useIsToolEnabled = (toolType: ToolType): boolean =>
  useAppStore((state: AppSettingsSlice): boolean => {
    const settingKey = TOOL_TYPE_TO_VIEW_SETTING[toolType];
    if (!settingKey) return true; // No setting = always enabled (e.g., FILES)
    return state.appSettings.data?.view[settingKey] ?? DEFAULT_VIEW_SETTINGS[settingKey];
  });
```

**Step 3: Add useIsPositionVisible selector**

Add after `useIsToolEnabled`:

```typescript
/** Check if any tool in a position is enabled (for panel visibility) */
export const useIsPositionVisible = (position: ToolbarPosition): boolean =>
  useAppStore((state: AppSettingsSlice): boolean => {
    const positionSettings = VIEW_SETTINGS_CONFIG.filter(s => s.position === position);
    return positionSettings.some(
      s => state.appSettings.data?.view[s.key] ?? DEFAULT_VIEW_SETTINGS[s.key]
    );
  });
```

**Step 4: Verify no lint errors**

Run: `npm run lint`
Expected: No errors in app-settings.selector.ts

**Step 5: Commit**

```bash
git add src/stores/app-settings/app-settings.selector.ts
git commit -m "feat: add useIsToolEnabled and useIsPositionVisible selectors"
```

---

## Task 3: Filter toolbar icons in left-toolbar.component.tsx

**Files:**
- Modify: `src/features/toolbars/components/left-toolbar.component.tsx`

**Step 1: Add import**

Add to imports:

```typescript
import { useViewSetting } from '@/stores/app-settings/app-settings.selector';
```

**Step 2: Add view setting hooks inside component**

Add at start of `LeftToolbarComponent` function body:

```typescript
const entitySearchEnabled = useViewSetting('entitySearch');
const chartsEnabled = useViewSetting('charts');
const aiPromptEnabled = useViewSetting('aiPrompt');
```

**Step 3: Filter topTools**

Add after the hooks:

```typescript
const enabledTopTools = topTools.filter(tool => {
  if (tool.type === 'FILES') return true;
  if (tool.type === 'ENTITY_SEARCH') return entitySearchEnabled;
  return true;
});
```

**Step 4: Filter bottomTools**

Add after enabledTopTools:

```typescript
const enabledBottomTools = bottomTools.filter(tool => {
  if (tool.type === 'CHARTS') return chartsEnabled;
  if (tool.type === 'PROMPT') return aiPromptEnabled;
  return true;
});

const showBottomSection = enabledBottomTools.length > 0;
```

**Step 5: Update render to use filtered arrays**

Replace `topTools.map` with `enabledTopTools.map` and `bottomTools.map` with `enabledBottomTools.map`.

Wrap bottom section with conditional:

```typescript
{showBottomSection && (
  <div className="mb-1 flex flex-col items-center gap-y-2">
    {enabledBottomTools.map(tool => {
      // ... existing code
    })}
    <SettingsMenuComponent />
  </div>
)}
{!showBottomSection && (
  <div className="mb-1">
    <SettingsMenuComponent />
  </div>
)}
```

**Step 6: Verify no lint errors**

Run: `npm run lint`
Expected: No errors

**Step 7: Commit**

```bash
git add src/features/toolbars/components/left-toolbar.component.tsx
git commit -m "feat: filter left toolbar icons by view settings"
```

---

## Task 4: Hide right toolbar when notification disabled

**Files:**
- Modify: `src/features/toolbars/components/right-toolbar.component.tsx`

**Step 1: Add import**

Add to imports:

```typescript
import { useViewSetting } from '@/stores/app-settings/app-settings.selector';
```

**Step 2: Add early return**

Add at start of `RightToolbarComponent` function body:

```typescript
const notificationEnabled = useViewSetting('notification');

if (!notificationEnabled) return null;
```

**Step 3: Verify no lint errors**

Run: `npm run lint`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/toolbars/components/right-toolbar.component.tsx
git commit -m "feat: hide right toolbar when notification disabled"
```

---

## Task 5: Conditionally unmount panels in main-view.component.tsx

**Files:**
- Modify: `src/features/main/components/main-view.component.tsx`

**Step 1: Add imports**

Add to imports:

```typescript
import { useEffect } from 'react';
import { useIsPositionVisible, useViewSettings } from '@/stores/app-settings/app-settings.selector';
import {
  TOOLBAR_POSITIONS,
  TOOL_TYPE_TO_VIEW_SETTING,
  VIEW_SETTING_TO_TOOL_TYPE,
  VIEW_SETTINGS_CONFIG
} from '@/models/view-settings.model';
```

**Step 2: Add visibility hooks**

Add inside `MainView` component:

```typescript
const showLeftPanel = useIsPositionVisible('left');
const showRightPanel = useIsPositionVisible('right');
const showBottomPanel = useIsPositionVisible('bottom');
const viewSettings = useViewSettings();
const { toggleToolbar } = useUiActions();
```

**Step 3: Add auto-activate useEffect**

Add after the hooks:

```typescript
// Auto-activate first enabled tool when current becomes disabled
useEffect(() => {
  TOOLBAR_POSITIONS.forEach(pos => {
    const currentTool = toolbarMode[pos];
    if (!currentTool) return;

    const settingKey = TOOL_TYPE_TO_VIEW_SETTING[currentTool];
    const isDisabled = settingKey && viewSettings?.[settingKey] === false;

    if (isDisabled) {
      // Find first enabled tool for this position
      const firstEnabled = VIEW_SETTINGS_CONFIG
        .filter(s => s.position === pos && viewSettings?.[s.key] !== false)
        .map(s => VIEW_SETTING_TO_TOOL_TYPE[s.key])[0];

      toggleToolbar(pos, firstEnabled ?? null);
    }
  });
}, [viewSettings, toolbarMode, toggleToolbar]);
```

**Step 4: Update left panel conditional**

Change left panel from using `!toolbarMode.left && 'hidden'` to fully unmounting:

```typescript
{showLeftPanel && (
  <>
    <ResizablePanel defaultSize={15} className={cn('min-w-[100px]', !toolbarMode.left && 'hidden')} collapsible>
      <div className="h-full">
        <ShowToolbarComponent toolType={toolbarMode.left} pos="left" />
      </div>
    </ResizablePanel>
    <ResizableHandle />
  </>
)}
```

**Step 5: Update right panel conditional**

```typescript
{showRightPanel && (
  <>
    <ResizableHandle />
    <ResizablePanel defaultSize={15} className={cn('min-w-[100px]', !toolbarMode.right && 'hidden')}>
      <ShowToolbarComponent toolType={toolbarMode.right} pos="right" />
    </ResizablePanel>
  </>
)}
```

**Step 6: Update bottom panel conditional**

```typescript
{showBottomPanel && (
  <>
    <ResizableHandle />
    <ResizablePanel defaultSize={30} className={cn('min-h-[100px]', !toolbarMode.bottom && 'hidden')}>
      <ShowToolbarComponent toolType={toolbarMode.bottom} pos="bottom" />
    </ResizablePanel>
  </>
)}
```

**Step 7: Verify no lint errors**

Run: `npm run lint`
Expected: No errors

**Step 8: Commit**

```bash
git add src/features/main/components/main-view.component.tsx
git commit -m "feat: conditionally unmount panels based on view settings"
```

---

## Task 6: Manual Testing

**Test Scenarios:**

1. **Disable entitySearch** → Entity Search icon hides from left toolbar, if active switches to Files
2. **Disable notification** → Right toolbar hides, right panel unmounts
3. **Disable both aiPrompt and charts** → Bottom section of left toolbar hides, bottom panel unmounts
4. **Re-enable features** → Icons reappear, panels remount
5. **Disable active tool** → Auto-switches to first remaining enabled tool

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test each scenario**

Open browser, use hamburger menu → View to toggle settings and verify behavior.

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: view settings control panel visibility"
```

---

## Summary

| Task | Files Modified | Description |
|------|----------------|-------------|
| 1 | view-settings.model.ts | Add tool type mappings |
| 2 | app-settings.selector.ts | Add visibility selectors |
| 3 | left-toolbar.component.tsx | Filter icons by settings |
| 4 | right-toolbar.component.tsx | Hide when notification disabled |
| 5 | main-view.component.tsx | Unmount panels, auto-activate |
| 6 | (none) | Manual testing |
