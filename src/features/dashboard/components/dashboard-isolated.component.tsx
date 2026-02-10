'use client';

import { Badge } from '@/components/ui/badge';

import { Entity } from '@/models/entity.model';

import DashboardSectionComponent from './dashboard-section.component';

import { SECTION_TOOLTIPS } from '../const';

interface Props {
  data: Entity[];
}

const DashboardIsolatedComponent = ({ data }: Props) => {
  const badgeText = data.length > 0 ? `${data.length} \u26A0` : '0';

  return (
    <DashboardSectionComponent
      title="Isolated Entities"
      tooltip={SECTION_TOOLTIPS.isolatedEntities}
      badge={badgeText}
    >
      {data.length === 0 ? (
        <p className="text-muted-foreground text-xs">No isolated entities</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {data.map((entity) => (
            <div
              key={entity.id}
              className="border-border flex items-center gap-1.5 rounded-md border px-2 py-1"
            >
              <span className="text-xs">{entity.labelNormalized}</span>
              <Badge variant="outline" className="text-xs">
                {entity.type}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </DashboardSectionComponent>
  );
};

export default DashboardIsolatedComponent;
