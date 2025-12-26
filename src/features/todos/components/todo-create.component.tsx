'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTodosCreateMutation } from '@/features/todos/hooks/useTodoCreateMutation';

const todoCreateSchema = z.object({
  text: z.string()
});

interface TodoCreateForm {
  text: string;
}

const TodoCreateComponent = () => {
  const { mutate: todoCreate, isPending } = useTodosCreateMutation();

  const form = useForm<TodoCreateForm>({
    resolver: zodResolver(todoCreateSchema),
    defaultValues: {
      text: ''
    }
  });

  const onSubmit = (data: TodoCreateForm) => {
    todoCreate({
      text: data.text
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Create Todo</CardTitle>
      </CardHeader>
      <CardContent className="mx-6 px-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
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
                Create
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TodoCreateComponent;
