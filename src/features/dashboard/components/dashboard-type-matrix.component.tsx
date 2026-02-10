'use client';

import { cn } from '@/lib/utils';

import DashboardSectionComponent from './dashboard-section.component';

import { SECTION_TOOLTIPS } from '../const';
import { TypeMatrix } from '../types';

interface Props {
  data: TypeMatrix;
}

/** Returns first 3 characters uppercased as a type abbreviation */
function abbreviate(type: string): string {
  return type.slice(0, 3).toUpperCase();
}

const DashboardTypeMatrixComponent = ({ data }: Props) => {
  if (data.types.length === 0) {
    return (
      <DashboardSectionComponent title="Type Matrix" tooltip={SECTION_TOOLTIPS.typeMatrix}>
        <p className="text-muted-foreground text-xs">No data</p>
      </DashboardSectionComponent>
    );
  }

  // Find the max value in the matrix for opacity scaling
  let maxVal = 0;
  for (const row of data.matrix) {
    for (const val of row) {
      if (val > maxVal) maxVal = val;
    }
  }

  return (
    <DashboardSectionComponent title="Type Matrix" tooltip={SECTION_TOOLTIPS.typeMatrix}>
      {/* Matrix grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-1" />
              {data.types.map((type) => (
                <th
                  key={type}
                  className="text-muted-foreground p-1 text-center font-normal"
                  title={type}
                >
                  {abbreviate(type)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.types.map((rowType, i) => (
              <tr key={rowType}>
                <td
                  className="text-muted-foreground p-1 text-right font-normal"
                  title={rowType}
                >
                  {abbreviate(rowType)}
                </td>
                {data.types.map((_, j) => {
                  // Matrix is upper-triangular: value at [min(i,j)][max(i,j)]
                  const ri = Math.min(i, j);
                  const ci = Math.max(i, j);
                  const count = data.matrix[ri][ci];
                  const opacity = maxVal > 0 ? count / maxVal : 0;

                  return (
                    <td key={j} className="p-1 text-center">
                      <div
                        className={cn(
                          'mx-auto flex h-7 w-7 items-center justify-center rounded-sm text-xs',
                          count > 0 ? 'text-primary-foreground' : 'text-muted-foreground'
                        )}
                        style={
                          count > 0
                            ? { backgroundColor: `hsl(var(--primary) / ${Math.max(0.15, opacity)})` }
                            : undefined
                        }
                        title={`${rowType} - ${data.types[j]}: ${count}`}
                      >
                        {count > 0 ? count : '\u00B7'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Strongest / Weakest callouts */}
      <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
        {data.strongest && (
          <p>
            <span className="font-medium">Strongest:</span> {data.strongest.typeA} —{' '}
            {data.strongest.typeB} ({data.strongest.count})
          </p>
        )}
        {data.weakest && (
          <p>
            <span className="font-medium">Weakest:</span> {data.weakest.typeA} —{' '}
            {data.weakest.typeB} ({data.weakest.count})
          </p>
        )}
      </div>
    </DashboardSectionComponent>
  );
};

export default DashboardTypeMatrixComponent;
