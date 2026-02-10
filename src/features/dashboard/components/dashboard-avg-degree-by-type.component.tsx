'use client';

import DashboardSectionComponent from './dashboard-section.component';

import { SECTION_TOOLTIPS } from '../const';
import { AvgDegreeByType } from '../types';

interface Props {
  data: AvgDegreeByType[];
  overallAvg: number;
}

const DashboardAvgDegreeByTypeComponent = ({ data, overallAvg }: Props) => {
  const maxAvg = Math.max(...data.map((d) => d.avgDegree), 0);

  return (
    <DashboardSectionComponent
      title="Avg Degree by Type"
      tooltip={SECTION_TOOLTIPS.avgDegreeByType}
    >
      {data.length === 0 ? (
        <p className="text-muted-foreground text-xs">No data</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {data.map((item) => {
              const widthPercent = maxAvg > 0 ? (item.avgDegree / maxAvg) * 100 : 0;

              return (
                <div key={item.type} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-28 shrink-0 truncate" title={item.type}>
                    {item.type}
                  </span>
                  <div className="bg-muted h-3.5 flex-1 overflow-hidden rounded-sm">
                    <div
                      className="bg-primary h-full rounded-sm transition-all"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-12 shrink-0 text-right font-mono">
                    {item.avgDegree.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            Overall avg: {overallAvg.toFixed(1)}
          </p>
        </>
      )}
    </DashboardSectionComponent>
  );
};

export default DashboardAvgDegreeByTypeComponent;
