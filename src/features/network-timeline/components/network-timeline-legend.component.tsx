'use client';

/**
 * Network Timeline Legend Component
 *
 * Displays the 5-tier color legend for collaboration frequency.
 */

import { COLOR_TIERS } from '../const';

const NetworkTimelineLegendComponent = () => {
  return (
    <div className="flex items-center gap-4 px-4 py-2">
      <span className="text-muted-foreground text-sm font-medium">Collaborations:</span>
      <div className="flex items-center gap-3">
        {COLOR_TIERS.map(tier => (
          <div key={tier.label} className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: tier.color }} />
            <span className="text-muted-foreground text-xs">{tier.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NetworkTimelineLegendComponent;
