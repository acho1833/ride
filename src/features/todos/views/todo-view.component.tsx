'use client';

import TodoEditComponent from '@/features/todos/components/todo-edit.component';
import { useTodoQuery } from '@/features/todos/hooks/useTodoQuery';

interface Props {
  id: string;
}

const TodoViewComponent = ({ id }: Props) => {
  const { data: todo } = useTodoQuery(id);

  if (!todo) return;

  return <TodoEditComponent todo={todo} />;
};

export default TodoViewComponent;
