# View Settings Panel Visibility Design

## Overview

Apply view settings from App Settings to control panel visibility in the UI. When a feature is disabled in settings, its toolbar icon hides and if all features in a position are disabled, the entire panel unmounts.

## Behavior

1. **Toolbar icons hide** when their corresponding view setting is disabled
2. **Auto-activate first enabled tool** when current active tool becomes disabled
3. **Panel unmounts entirely** when all features in that position are disabled
4. **Toolbar sections hide** when their corresponding panel has no enabled features

### Position Mapping

| View Setting Key | Tool Type | Position |
|------------------|-----------|----------|
| `entitySearch` | `ENTITY_SEARCH` | left |
| `notification` | `ALERT` | right |
| `aiPrompt` | `PROMPT` | bottom |
| `charts` | `CHARTS` | bottom |
| (none) | `FILES` | left (always visible) |

### Edge Cases

- **FILES tool**: No view setting, always visible. Left panel stays visible if FILES is available.
- **Empty position**: If all features in a position are disabled, panel unmounts and space is reclaimed by other panels.
- **Active tool disabled**: Auto-switches to first remaining enabled tool in that position, or `null` if none.

## File Structure

```
src/
├── models/
│   └── view-settings.model.ts              # MODIFY: Add VIEW_SETTING_TO_TOOL_TYPE, TOOL_TYPE_TO_VIEW_SETTING, TOOLBAR_POSITIONS
│
├── stores/
│   └── app-settings/
│       └── app-settings.selector.ts        # MODIFY: Add useIsToolEnabled, useIsPositionVisible
│
└── features/
    ├── toolbars/
    │   └── components/
    │       ├── left-toolbar.component.tsx  # MODIFY: Filter topTools/bottomTools, hide bottom section if empty
    │       └── right-toolbar.component.tsx # MODIFY: Hide entirely if notification disabled
    │
    └── main/
        └── components/
            └── main-view.component.tsx     # MODIFY: Conditionally unmount panels, auto-activate first enabled tool
```

**Total: 5 files to modify, 0 new files**

## Implementation Details

### 1. view-settings.model.ts

Add mappings between ViewSettingKey and ToolType:

```typescript
import { ToolType } from '@/features/toolbars/types';

/** Array of all toolbar positions for iteration */
export const TOOLBAR_POSITIONS: ToolbarPosition[] = ['left', 'right', 'bottom'];

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

### 2. app-settings.selector.ts

Add selector hooks:

```typescript
/** Check if a specific tool type is enabled (tools without settings return true) */
export const useIsToolEnabled = (toolType: ToolType): boolean =>
  useAppStore((state: AppSettingsSlice): boolean => {
    const settingKey = TOOL_TYPE_TO_VIEW_SETTING[toolType];
    if (!settingKey) return true; // No setting = always enabled (e.g., FILES)
    return state.appSettings.data?.view[settingKey] ?? DEFAULT_VIEW_SETTINGS[settingKey];
  });

/** Check if any tool in a position is enabled */
export const useIsPositionVisible = (position: ToolbarPosition): boolean =>
  useAppStore((state: AppSettingsSlice): boolean => {
    const positionSettings = VIEW_SETTINGS_CONFIG.filter(s => s.position === position);
    return positionSettings.some(s =>
      state.appSettings.data?.view[s.key] ?? DEFAULT_VIEW_SETTINGS[s.key]
    );
  });
```

### 3. left-toolbar.component.tsx

Filter tools by view settings and hide bottom section if empty:

```typescript
import { useViewSetting } from '@/stores/app-settings/app-settings.selector';

// Inside component:
const entitySearchEnabled = useViewSetting('entitySearch');
const chartsEnabled = useViewSetting('charts');
const aiPromptEnabled = useViewSetting('aiPrompt');

// Filter tools
const enabledTopTools = topTools.filter(tool => {
  if (tool.type === 'FILES') return true;
  if (tool.type === 'ENTITY_SEARCH') return entitySearchEnabled;
  return true;
});

const enabledBottomTools = bottomTools.filter(tool => {
  if (tool.type === 'CHARTS') return chartsEnabled;
  if (tool.type === 'PROMPT') return aiPromptEnabled;
  return true;
});

const showBottomSection = enabledBottomTools.length > 0;
```

### 4. right-toolbar.component.tsx

Hide entirely if notification disabled:

```typescript
import { useViewSetting } from '@/stores/app-settings/app-settings.selector';

const RightToolbarComponent = ({ activeToolType }: Props) => {
  const notificationEnabled = useViewSetting('notification');

  if (!notificationEnabled) return null;

  // ... rest unchanged
};
```

### 5. main-view.component.tsx

Conditionally unmount panels and auto-activate first enabled tool:

```typescript
import { useEffect } from 'react';
import { useIsPositionVisible, useViewSettings } from '@/stores/app-settings/app-settings.selector';
import { TOOLBAR_POSITIONS, TOOL_TYPE_TO_VIEW_SETTING, VIEW_SETTING_TO_TOOL_TYPE, VIEW_SETTINGS_CONFIG } from '@/models/view-settings.model';

const MainView = () => {
  const showLeftPanel = useIsPositionVisible('left');
  const showRightPanel = useIsPositionVisible('right');
  const showBottomPanel = useIsPositionVisible('bottom');

  const toolbarMode = useToolbarMode();
  const viewSettings = useViewSettings();
  const { toggleToolbar } = useUiActions();

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

  // Conditionally render panels based on visibility
  // Unmount entirely when not visible to allow other panels to expand
};
```

## Testing

Manual testing scenarios:

1. Disable `entitySearch` → Entity Search icon hides, if active switches to Files
2. Disable `notification` → Right toolbar and panel hide entirely
3. Disable both `aiPrompt` and `charts` → Bottom section of left toolbar hides, bottom panel unmounts
4. Re-enable features → Icons reappear, panels remount
5. Disable all features in a position while that tool is active → Auto-switches to first remaining or null
