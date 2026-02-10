'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

import DashboardSectionComponent from './dashboard-section.component';

import { LEAF_DISPLAY_LIMIT, SECTION_TOOLTIPS } from '../const';
import { LeafEntity } from '../types';

interface Props {
  data: LeafEntity[];
}

const DashboardLeafComponent = ({ data }: Props) => {
  const [expanded, setExpanded] = useState(false);

  const visibleItems = expanded ? data : data.slice(0, LEAF_DISPLAY_LIMIT);
  const hiddenCount = data.length - LEAF_DISPLAY_LIMIT;

  return (
    <DashboardSectionComponent
      title="Leaf Entities"
      tooltip={SECTION_TOOLTIPS.leafEntities}
      badge={data.length}
    >
      {data.length === 0 ? (
        <p className="text-muted-foreground text-xs">No leaf entities</p>
      ) : (
        <div className="space-y-1.5">
          {visibleItems.map((leaf) => (
            <div key={leaf.entity.id} className="flex items-center gap-1.5 text-xs">
              <span className="truncate font-medium" title={leaf.entity.labelNormalized}>
                {leaf.entity.labelNormalized}
              </span>
              <span className="text-muted-foreground">--</span>
              <span className="text-muted-foreground italic">{leaf.relationship.predicate}</span>
              <span className="text-muted-foreground">--&gt;</span>
              <span className="truncate" title={leaf.connectedEntity.labelNormalized}>
                {leaf.connectedEntity.labelNormalized}
              </span>
            </div>
          ))}

          {!expanded && hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setExpanded(true)}
            >
              +{hiddenCount} more
            </Button>
          )}

          {expanded && hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setExpanded(false)}
            >
              Show less
            </Button>
          )}
        </div>
      )}
    </DashboardSectionComponent>
  );
};

export default DashboardLeafComponent;
