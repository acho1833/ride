'use client';

import TodoListComponent from '@/features/todos/components/todo-list.component';
import TodoCreateComponent from '@/features/todos/components/todo-create.component';

const TodosViewComponent = () => {
  return (
    <div className="container mx-auto flex h-full max-w-4xl flex-col gap-y-7 p-6">
      <TodoCreateComponent />
      <div className="bg-background flex w-full items-center justify-center">
        <TodoListComponent />
      </div>
    </div>
  );
};

export default TodosViewComponent;
