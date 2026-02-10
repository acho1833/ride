'use client';

import DashboardBarComponent from './dashboard-bar.component';
import DashboardSectionComponent from './dashboard-section.component';

import { SECTION_TOOLTIPS } from '../const';
import { DegreeBucket } from '../types';

interface Props {
  data: DegreeBucket[];
  median: number;
  max: number;
}

const DashboardDegreeDistributionComponent = ({ data, median, max }: Props) => {
  const maxCount = Math.max(...data.map((b) => b.count), 0);

  return (
    <DashboardSectionComponent
      title="Degree Distribution"
      tooltip={SECTION_TOOLTIPS.degreeDistribution}
    >
      {data.length === 0 ? (
        <p className="text-muted-foreground text-xs">No data</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {data.map((bucket) => (
              <DashboardBarComponent
                key={bucket.range}
                label={bucket.range}
                value={bucket.count}
                maxValue={maxCount}
              />
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            median: {median} | max: {max}
          </p>
        </>
      )}
    </DashboardSectionComponent>
  );
};

export default DashboardDegreeDistributionComponent;
