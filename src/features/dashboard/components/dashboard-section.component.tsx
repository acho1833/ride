'use client';

import { type ReactNode } from 'react';
import { Info } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  title: string;
  tooltip: string;
  children: ReactNode;
  badge?: string | number;
  className?: string;
}

const DashboardSectionComponent = ({ title, tooltip, children, badge, className }: Props) => {
  return (
    <Card className={cn('gap-3 py-3', className)}>
      <CardHeader className="py-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="text-muted-foreground h-3.5 w-3.5 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {badge !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="py-0">{children}</CardContent>
    </Card>
  );
};

export default DashboardSectionComponent;
