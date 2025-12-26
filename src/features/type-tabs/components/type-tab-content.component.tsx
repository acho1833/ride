/**
 * Type Tab Content Router
 *
 * Routes to the appropriate chart component based on tab type.
 */

import React from 'react';
import { SpreadlineData, Tab } from '@/stores/type-tabs/type-tabs.store';
import SpreadlineComponent from '@/features/spreadlines/components/spreadline.component';

interface Props {
  tab: Tab;
}

/**
 * Type tab content router component
 * Renders the appropriate chart component based on tab type
 */
const TypeTabContent = ({ tab }: Props) => {
  // Route to appropriate component based on type
  switch (tab.type) {
    case 'SPREADLINE':
      return <SpreadlineComponent tabId={tab.id} tabName={tab.name} data={tab.data as SpreadlineData} />;

    case 'BAR':
    case 'LINE':
    case 'PIE':
      // Placeholder for future chart types
      return (
        <div className="bg-background flex h-full flex-col items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold">{tab.type} Chart</h2>
            <p className="text-muted-foreground mt-2 text-sm">{tab.name}</p>
            <div className="bg-muted/30 mt-4 rounded-md border p-4">
              <p className="text-muted-foreground text-sm">{tab.type} chart component coming soon...</p>
            </div>
          </div>
        </div>
      );

    default:
      // Fallback for unknown types
      return (
        <div className="bg-background flex h-full flex-col items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Unknown Chart Type</h2>
            <p className="text-muted-foreground mt-2 text-sm">{tab.name}</p>
            <p className="text-muted-foreground mt-1 text-xs">Type: {tab.type}</p>
            <div className="bg-muted/30 mt-4 rounded-md border p-4">
              <p className="text-muted-foreground text-sm">No component available for this chart type.</p>
            </div>
          </div>
        </div>
      );
  }
};

export default TypeTabContent;
