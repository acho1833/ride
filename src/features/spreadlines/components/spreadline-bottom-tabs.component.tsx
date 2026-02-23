'use client';

import type { SpreadlineBottomTab } from '@/features/spreadlines/const';

interface Props {
  activeTab: SpreadlineBottomTab;
  onTabChange: (tab: SpreadlineBottomTab) => void;
}

const SpreadlineBottomTabsComponent = ({ activeTab, onTabChange }: Props) => {
  return (
    <div className="border-border bg-background flex shrink-0 items-center gap-0 border-b text-xs">
      <button
        className={`px-3 py-1.5 font-medium transition-colors ${
          activeTab === 'spreadline'
            ? 'text-primary border-primary border-b-2'
            : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
        }`}
        onClick={() => onTabChange('spreadline')}
      >
        Spreadline
      </button>
      <button
        className={`px-3 py-1.5 font-medium transition-colors ${
          activeTab === 'network-timeline'
            ? 'text-primary border-primary border-b-2'
            : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
        }`}
        onClick={() => onTabChange('network-timeline')}
      >
        Network Timeline
      </button>
    </div>
  );
};

export default SpreadlineBottomTabsComponent;
