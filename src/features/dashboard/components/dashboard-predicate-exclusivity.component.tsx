'use client';

import { Badge } from '@/components/ui/badge';

import DashboardSectionComponent from './dashboard-section.component';

import { SECTION_TOOLTIPS } from '../const';
import { PredicateExclusivity } from '../types';

interface Props {
  data: PredicateExclusivity;
}

const DashboardPredicateExclusivityComponent = ({ data }: Props) => {
  const hasData = data.exclusive.length > 0 || data.generic.length > 0;

  return (
    <DashboardSectionComponent title="Predicate Exclusivity" tooltip={SECTION_TOOLTIPS.predicateExclusivity}>
      {!hasData ? (
        <p className="text-muted-foreground text-xs">No data</p>
      ) : (
        <div className="space-y-3">
          {/* Exclusive predicates */}
          {data.exclusive.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Exclusive ({data.exclusive.length})</p>
              <div className="space-y-1">
                {data.exclusive.map(item => (
                  <div key={item.predicate} className="flex items-center gap-1.5 text-xs">
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {item.predicate}
                    </Badge>
                    <span className="text-muted-foreground">
                      {item.sourceType} &rarr; {item.targetType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generic predicates */}
          {data.generic.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Generic ({data.generic.length})</p>
              <div className="space-y-1.5">
                {data.generic.map(item => (
                  <div key={item.predicate} className="space-y-0.5">
                    <Badge variant="secondary" className="text-xs">
                      {item.predicate}
                    </Badge>
                    <div className="text-muted-foreground pl-2 text-xs">
                      {item.typePairs.map((pair, i) => (
                        <span key={i}>
                          {pair.sourceType} &rarr; {pair.targetType}
                          {i < item.typePairs.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardSectionComponent>
  );
};

export default DashboardPredicateExclusivityComponent;
