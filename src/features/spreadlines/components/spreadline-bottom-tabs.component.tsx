'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SpreadlineBottomTab } from '@/features/spreadlines/const';

interface Props {
  activeTab: SpreadlineBottomTab;
  onTabChange: (tab: SpreadlineBottomTab) => void;
}

const SpreadlineBottomTabsComponent = ({ activeTab, onTabChange }: Props) => {
  return (
    <div className="border-border bg-background shrink-0 border-b">
      <Tabs value={activeTab} onValueChange={val => onTabChange(val as SpreadlineBottomTab)}>
        <TabsList className="h-8 rounded-none bg-transparent p-0">
          <TabsTrigger
            value="spreadline"
            className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs font-medium"
          >
            Spreadline
          </TabsTrigger>
          <TabsTrigger
            value="network-timeline"
            className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs font-medium"
          >
            Network Timeline
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default SpreadlineBottomTabsComponent;
