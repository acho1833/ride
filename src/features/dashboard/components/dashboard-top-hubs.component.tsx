'use client';

import { Badge } from '@/components/ui/badge';

import DashboardSectionComponent from './dashboard-section.component';

import { SECTION_TOOLTIPS } from '../const';
import { HubEntity } from '../types';

interface Props {
  data: HubEntity[];
}

const DashboardTopHubsComponent = ({ data }: Props) => {
  const maxDegree = data[0]?.degree ?? 0;

  return (
    <DashboardSectionComponent title="Top Hubs" tooltip={SECTION_TOOLTIPS.topHubs}>
      {data.length === 0 ? (
        <p className="text-muted-foreground text-xs">No data</p>
      ) : (
        <div className="space-y-3">
          {data.map((hub, index) => (
            <div key={hub.entity.id} className="space-y-1">
              {/* Hub header: rank, name, type badge */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-4 shrink-0 text-xs font-mono">
                  {index + 1}
                </span>
                <span className="truncate text-sm font-medium" title={hub.entity.labelNormalized}>
                  {hub.entity.labelNormalized}
                </span>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {hub.entity.type}
                </Badge>
              </div>

              {/* Degree bar */}
              <div className="flex items-center gap-2 pl-6 text-xs">
                <div className="bg-muted h-3 flex-1 overflow-hidden rounded-sm">
                  <div
                    className="bg-primary h-full rounded-sm transition-all"
                    style={{ width: `${maxDegree > 0 ? (hub.degree / maxDegree) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-muted-foreground w-8 shrink-0 text-right font-mono">
                  {hub.degree}
                </span>
              </div>

              {/* Predicate breakdown */}
              {hub.predicateBreakdown.length > 0 && (
                <p className="text-muted-foreground truncate pl-6 text-xs">
                  {hub.predicateBreakdown.map((p) => `${p.label} (${p.count})`).join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardSectionComponent>
  );
};

export default DashboardTopHubsComponent;
