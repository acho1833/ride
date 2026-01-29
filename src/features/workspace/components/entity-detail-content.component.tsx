'use client';

/**
 * Entity Detail Content Component
 *
 * Provides header (icon + name) and body (type) for entity detail popup.
 * Pure content component — no position or drag logic.
 */

import { ENTITY_ICON_CONFIG, DEFAULT_ENTITY_ICON } from '@/const';
import type { Entity } from '@/models/entity.model';

interface Props {
  entity: Entity;
}

/** Header content: icon + entity name */
export const EntityDetailHeader = ({ entity }: Props) => {
  const iconConfig = ENTITY_ICON_CONFIG[entity.type] ?? DEFAULT_ENTITY_ICON;

  return (
    <>
      <i className={`${iconConfig.cssClass} text-muted-foreground shrink-0 text-sm`} />
      <span className="truncate text-xs font-medium">{entity.labelNormalized}</span>
    </>
  );
};

/** Body content: entity type */
export const EntityDetailBody = ({ entity }: Props) => {
  return (
    <div className="text-muted-foreground text-[11px]">
      <span className="text-muted-foreground/70">Type:</span> {entity.type}
    </div>
  );
};

// Keep default export for backwards compatibility
const EntityDetailContentComponent = ({ entity }: Props) => {
  return (
    <>
      <EntityDetailHeader entity={entity} />
      <EntityDetailBody entity={entity} />
    </>
  );
};

export default EntityDetailContentComponent;
