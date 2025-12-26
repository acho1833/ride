/**
 * Spreadline Component
 *
 * Example chart component for SPREADLINE type.
 * Displays spreadline chart data.
 */

import React from 'react';
import { SpreadlineData } from '@/stores/type-tabs/type-tabs.store';
import Image from 'next/image';

interface Props {
  tabId: string;
  tabName: string;
  data: SpreadlineData;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SpreadlineComponent = ({ tabId, tabName, data }: Props) => {
  return (
    <div className="bg-background flex h-full flex-col p-6">
      <Image src="/img/spreadline.jpg" alt="spreadline image" height={400} width={800} />
    </div>
  );
};

export default SpreadlineComponent;
