'use client';

import DashboardSectionComponent from './dashboard-section.component';

import { SECTION_TOOLTIPS } from '../const';
import { RelationshipPath } from '../types';

interface Props {
  data: RelationshipPath[];
}

const DashboardRelationshipPathsComponent = ({ data }: Props) => {
  const maxCount = data[0]?.count ?? 0;

  return (
    <DashboardSectionComponent title="Relationship Paths" tooltip={SECTION_TOOLTIPS.relationshipPaths}>
      {data.length === 0 ? (
        <p className="text-muted-foreground text-xs">No data</p>
      ) : (
        <div className="space-y-2">
          {data.map(path => {
            const key = `${path.sourceType}-${path.predicate}-${path.targetType}`;
            const widthPercent = maxCount > 0 ? (path.count / maxCount) * 100 : 0;

            return (
              <div key={key} className="space-y-0.5">
                <div className="flex items-center gap-1 text-xs">
                  <span className="font-medium">{path.sourceType}</span>
                  <span className="text-muted-foreground">--</span>
                  <span className="text-muted-foreground italic">{path.predicate}</span>
                  <span className="text-muted-foreground">--&gt;</span>
                  <span className="font-medium">{path.targetType}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="bg-muted h-3 flex-1 overflow-hidden rounded-sm">
                    <div className="bg-primary h-full rounded-sm transition-all" style={{ width: `${widthPercent}%` }} />
                  </div>
                  <span className="text-muted-foreground w-8 shrink-0 text-right font-mono">{path.count}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardSectionComponent>
  );
};

export default DashboardRelationshipPathsComponent;
