'use client';

import { Entity } from '@/models/entity.model';

interface Props {
  entity: Entity;
}

/**
 * Upstream default: renders entity attributes as a simple key/value list.
 *
 * Downstream projects override this file to render attributes with a custom
 * layout — different field order, grid arrangement, richer formatting, etc.
 */
const EntityCardContentComponent = ({ entity }: Props) => {
  if (!entity.attributes || Object.keys(entity.attributes).length === 0) return null;

  return (
    <dl className="mt-2 space-y-1 text-xs">
      {Object.entries(entity.attributes).map(([key, value]) => (
        <div key={key} className="flex gap-x-2">
          <dt className="text-muted-foreground capitalize">{key}:</dt>
          <dd className="text-foreground">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
};

export default EntityCardContentComponent;
