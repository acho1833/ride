'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { useTodosQuery } from '@/features/todos/hooks/useTodosQuery';
import { useTodosDeleteMutation } from '@/features/todos/hooks/useTodoDeleteMutation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/features/todos/const';
import TodoListLoadingComponent from '@/features/todos/components/todo-list-loading.component';

const TodoListComponent = () => {
  const { data: todos, isPending } = useTodosQuery();
  const { mutate: todoDelete, isPending: isPendingTodoDelete, variables: variablesTodoDelete } = useTodosDeleteMutation();

  const onDelete = (id: string) => {
    todoDelete({ id });
  };

  return (
    <div className="flex w-full flex-col gap-y-1">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Todo List</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <TodoListLoadingComponent />
          ) : todos?.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No todos yet. Start by adding one!</p>
          ) : (
            <ul className="space-y-2">
              {todos?.map(todo => (
                <li key={todo.id}>
                  <Link
                    href={ROUTES.TODO(todo.id)}
                    className={cn(
                      'hover:bg-muted/50 bg-muted block rounded-lg border p-4',
                      isPendingTodoDelete && variablesTodoDelete?.id === todo.id && 'pointer-events-none'
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {todo.completed ? (
                          <CheckCircle2 className="text-primary h-5 w-5 shrink-0" />
                        ) : (
                          <Circle className="text-muted-foreground h-5 w-5 shrink-0" />
                        )}
                        <span className={`truncate text-base ${todo.completed ? 'text-muted-foreground line-through' : ''}`}>
                          {todo.text}
                        </span>
                      </div>
                      <Badge variant={todo.completed ? 'default' : 'secondary'} className="shrink-0">
                        {todo.completed ? 'Completed' : 'Pending'}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isPendingTodoDelete && variablesTodoDelete?.id === todo.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDelete(todo.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TodoListComponent;
