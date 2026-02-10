'use client';

import { cn } from '@/lib/utils';

import DashboardSectionComponent from './dashboard-section.component';

import { SECTION_TOOLTIPS } from '../const';
import { GraphComponent } from '../types';

interface Props {
  data: GraphComponent[];
}

const DashboardGraphComponentsComponent = ({ data }: Props) => {
  return (
    <DashboardSectionComponent
      title="Graph Components"
      tooltip={SECTION_TOOLTIPS.graphComponents}
      badge={data.length}
    >
      {data.length === 0 ? (
        <p className="text-muted-foreground text-xs">No data</p>
      ) : (
        <div className="space-y-2">
          {data.map((comp) => (
            <div
              key={comp.id}
              className={cn(
                'border-border rounded-md border px-3 py-2 text-xs',
                comp.isMainComponent && 'bg-muted/50'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {comp.isMainComponent ? 'Main Component' : `Component ${comp.id + 1}`}
                  {comp.relCount === 0 && ' (Isolated)'}
                </span>
                <span className="text-muted-foreground">{comp.percentage.toFixed(1)}%</span>
              </div>
              <div className="text-muted-foreground mt-0.5">
                {comp.entityCount} entities, {comp.relCount} relationships
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardSectionComponent>
  );
};

export default DashboardGraphComponentsComponent;
