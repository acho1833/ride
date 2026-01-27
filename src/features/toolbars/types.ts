export type ToolType = 'ENTITY_SEARCH' | 'ALERT' | 'PROMPT' | 'FILES' | 'CHARTS';

/** Types of panels that can be focused for visual highlighting */
export type FocusedPanelType = 'files' | 'entity-search' | 'charts' | 'alerts' | 'prompt' | `editor-group-${string}` | null;

export type ToolTypeOption = {
  type: ToolType;
  description: string;
  icon: React.ComponentType<{ className?: string }> | string;
};
