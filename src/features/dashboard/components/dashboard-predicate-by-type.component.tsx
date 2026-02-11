'use client';

import { Badge } from '@/components/ui/badge';

import DashboardSectionComponent from './dashboard-section.component';

import { SECTION_TOOLTIPS } from '../const';
import { PredicateByType } from '../types';

interface Props {
  data: PredicateByType[];
}

const DashboardPredicateByTypeComponent = ({ data }: Props) => {
  return (
    <DashboardSectionComponent title="Predicates by Type" tooltip={SECTION_TOOLTIPS.predicateByType}>
      {data.length === 0 ? (
        <p className="text-muted-foreground text-xs">No data</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {data.map(item => {
            const maxCount = item.predicates[0]?.count ?? 0;

            return (
              <div key={item.type} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {item.type}
                  </Badge>
                </div>
                {item.predicates.map(pred => {
                  const widthPercent = maxCount > 0 ? (pred.count / maxCount) * 100 : 0;

                  return (
                    <div key={pred.label} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-24 shrink-0 truncate" title={pred.label}>
                        {pred.label}
                      </span>
                      <div className="bg-muted h-2.5 flex-1 overflow-hidden rounded-sm">
                        <div className="bg-primary h-full rounded-sm transition-all" style={{ width: `${widthPercent}%` }} />
                      </div>
                      <span className="text-muted-foreground w-6 shrink-0 text-right font-mono">{pred.count}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </DashboardSectionComponent>
  );
};

export default DashboardPredicateByTypeComponent;
