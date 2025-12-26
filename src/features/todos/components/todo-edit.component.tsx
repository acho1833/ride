'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTodosUpdateMutation } from '@/features/todos/hooks/useTodoUpdateMutation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Todo, todoSchema } from '@/models/todo.model';
import { ROUTES } from '@/features/todos/const';

interface Props {
  todo: Todo;
}

const TodoEditComponent = ({ todo }: Props) => {
  const { mutate: todoUpdate, isPending } = useTodosUpdateMutation();
  const router = useRouter();
  const form = useForm<Todo>({
    resolver: zodResolver(todoSchema),
    defaultValues: todo
  });

  const onUpdate = (data: Todo) => {
    todoUpdate(data, {
      onSuccess: () => {
        router.push(ROUTES.TODOS);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Edit Todo</CardTitle>
      </CardHeader>
      <CardContent className="mx-6 px-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onUpdate)}>
            <div className="flex items-center gap-x-4">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem className="flex flex-1">
                    <FormControl>
                      <Input type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending || !form.formState.isValid}>
                Update
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TodoEditComponent;
