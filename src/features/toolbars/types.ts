export type ToolType = 'ENTITY_SEARCH' | 'ALERT' | 'PROMPT' | 'FILES' | 'CHARTS';

export type ToolTypeOption = {
  type: ToolType;
  description: string;
  icon: React.ComponentType<{ className?: string }> | string;
};
