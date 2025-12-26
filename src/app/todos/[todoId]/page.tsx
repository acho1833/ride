import TodoViewComponent from '@/features/todos/views/todo-view.component';

interface PageProps {
  params: Promise<{ todoId: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { todoId } = await params;

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <TodoViewComponent id={todoId} />
    </div>
  );
};

export default Page;
