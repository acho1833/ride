'use client';

import { Skeleton } from '@/components/ui/skeleton';

const TodoListLoadingComponent = () => {
  return (
    <div>
      <Skeleton className="block h-[66px] w-full rounded-lg border" />
      <Skeleton className="block h-[66px] w-full rounded-lg border" />
      <Skeleton className="block h-[66px] w-full rounded-lg border" />
    </div>
  );
};

export default TodoListLoadingComponent;
