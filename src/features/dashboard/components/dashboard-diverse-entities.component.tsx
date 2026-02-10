'use client';

import { Badge } from '@/components/ui/badge';

import DashboardSectionComponent from './dashboard-section.component';

import { SECTION_TOOLTIPS } from '../const';
import { DiverseEntity } from '../types';

interface Props {
  data: DiverseEntity[];
}

const DashboardDiverseEntitiesComponent = ({ data }: Props) => {
  return (
    <DashboardSectionComponent
      title="Diverse Entities"
      tooltip={SECTION_TOOLTIPS.diverseEntities}
      badge={data.length}
    >
      {data.length === 0 ? (
        <p className="text-muted-foreground text-xs">No data</p>
      ) : (
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={item.entity.id} className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-4 shrink-0 font-mono">{index + 1}</span>
                <span className="truncate font-medium" title={item.entity.labelNormalized}>
                  {item.entity.labelNormalized}
                </span>
                <span className="text-muted-foreground shrink-0">
                  ({item.typeCount} types)
                </span>
              </div>
              <div className="flex flex-wrap gap-1 pl-6">
                {item.types.map((type) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardSectionComponent>
  );
};

export default DashboardDiverseEntitiesComponent;
