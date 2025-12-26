'use client';

import { Skeleton } from '@/components/ui/skeleton';

const TodoListLoadingComponent = () => {
  return (
    <div className="space-y-2">
      <Skeleton className="bg-muted block h-[66px] w-full rounded-lg border" />
      <Skeleton className="bg-muted block h-[66px] w-full rounded-lg border" />
      <Skeleton className="bg-muted block h-[66px] w-full rounded-lg border" />
    </div>
  );
};

export default TodoListLoadingComponent;
