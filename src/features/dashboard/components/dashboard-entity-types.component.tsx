'use client';

import DashboardBarComponent from './dashboard-bar.component';
import DashboardSectionComponent from './dashboard-section.component';

import { SECTION_TOOLTIPS } from '../const';
import { DistributionItem } from '../types';

interface Props {
  data: DistributionItem[];
}

const DashboardEntityTypesComponent = ({ data }: Props) => {
  const maxValue = data[0]?.count ?? 0;

  return (
    <DashboardSectionComponent
      title="Entity Types"
      tooltip={SECTION_TOOLTIPS.entityTypeDistribution}
      badge={data.length}
    >
      {data.length === 0 ? (
        <p className="text-muted-foreground text-xs">No data</p>
      ) : (
        <div className="space-y-1.5">
          {data.map((item) => (
            <DashboardBarComponent
              key={item.label}
              label={item.label}
              value={item.count}
              maxValue={maxValue}
            />
          ))}
        </div>
      )}
    </DashboardSectionComponent>
  );
};

export default DashboardEntityTypesComponent;
