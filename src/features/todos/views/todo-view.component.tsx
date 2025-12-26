'use client';

import TodoEditComponent from '@/features/todos/components/todo-edit.component';
import { useTodoQuery } from '@/features/todos/hooks/useTodoQuery';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface Props {
  id: string;
}

const TodoViewComponent = ({ id }: Props) => {
  const { data: todo, isPending } = useTodoQuery(id);

  if (isPending || !todo) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="bg-muted h-8 w-32" />
        </CardHeader>
        <CardContent className="mx-6 px-4">
          <div className="flex items-center gap-x-4">
            <Skeleton className="bg-muted h-10 flex-1" />
            <Skeleton className="bg-muted h-10 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return <TodoEditComponent todo={todo} />;
};

export default TodoViewComponent;
