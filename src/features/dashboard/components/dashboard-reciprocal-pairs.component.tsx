'use client';

import { Badge } from '@/components/ui/badge';

import DashboardSectionComponent from './dashboard-section.component';

import { SECTION_TOOLTIPS } from '../const';
import { ReciprocalPair } from '../types';

interface Props {
  data: ReciprocalPair[];
}

const DashboardReciprocalPairsComponent = ({ data }: Props) => {
  return (
    <DashboardSectionComponent
      title="Reciprocal Pairs"
      tooltip={SECTION_TOOLTIPS.reciprocalPairs}
      badge={data.length}
    >
      {data.length === 0 ? (
        <p className="text-muted-foreground text-xs">No data</p>
      ) : (
        <div className="space-y-2">
          {data.map((pair) => (
            <div
              key={`${pair.entityA.id}-${pair.entityB.id}`}
              className="border-border space-y-1 border-b pb-2 last:border-b-0"
            >
              <div className="flex items-center gap-1.5 text-xs">
                <span className="truncate font-medium" title={pair.entityA.labelNormalized}>
                  {pair.entityA.labelNormalized}
                </span>
                <span className="text-muted-foreground shrink-0">&hArr;</span>
                <span className="truncate font-medium" title={pair.entityB.labelNormalized}>
                  {pair.entityB.labelNormalized}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {pair.predicates.map((pred) => (
                  <Badge key={pred} variant="secondary" className="text-xs">
                    {pred}
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

export default DashboardReciprocalPairsComponent;
