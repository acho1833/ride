# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
docker-compose up -d     # Start MongoDB (required)

# Build & Quality
npm run build            # Lint + build for production
npm run lint             # Run ESLint
npm run format           # Format with Prettier

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode

# Database
docker-compose up -d     # Start MongoDB
docker-compose down      # Stop MongoDB
npm run mongo-gui        # MongoDB web GUI (port 3091)
```

## Architecture

### Page/Layout Pattern (CRITICAL)

**Pages and layouts MUST be simple and delegate to feature view components.**

```typescript
// src/app/todos/page.tsx - CORRECT: Simple delegation
import TodosViewComponent from '@/features/todos/views/todos-view.component';

export default function Page() {
  return (
    <div className="bg-background flex w-full items-center justify-center">
      <TodosViewComponent />
    </div>
  );
}

// For dynamic routes with params:
// src/app/todos/[todoId]/page.tsx
const Page = async ({ params }: { params: Promise<{ todoId: string }> }) => {
  const { todoId } = await params;
  return <TodoViewComponent id={todoId} />;
};
```

- Pages contain NO business logic, NO hooks, NO data fetching
- Layouts only add structural elements (headers, wrappers)
- All logic lives in feature view components

### Feature-Based Organization

Code is organized by feature in `src/features/`. Each feature contains:
- `server/` - All server-side code (uses `import 'server-only'`)
  - `routers.ts` - ORPC procedure definitions. Validate input/output only. Delegate business logic to services
  - `services/` - Business logic (database operations, external APIs)
- `hooks/` - React Query hooks using `@orpc/tanstack-query`
- `views/` - Page-level components (consumed by app pages)
- `components/` - Feature-specific components
- `const.ts` - Feature-specific constants and configuration
- `types.ts` - Feature-specific types
- `utils.ts` - Feature-specific utils

**Note:** Not all features require server code. Client-only features (like the editor) may only have `components/`, `views/`, and `const.ts`. The structure adapts to what the feature needs.

### Server Code Pattern (CRITICAL)

**All server-side code MUST be in the `server/` directory and use `import 'server-only'`.**

#### ORPC Router Pattern

```typescript
// src/features/todos/server/routers.ts
import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { todoSchema } from '@/models/todo.model';
import * as todoService from '@/features/todos/server/services/todo.service';

const API_TODO_PREFIX = '/todos';
const tags = ['Todo'];

export const todoRouter = appProcedure.router({
  getAll: appProcedure
    .route({
      method: 'GET',
      path: API_TODO_PREFIX,
      summary: 'Get all todos',
      tags
    })
    .output(todoSchema.array())
    .handler(async () => {
      return todoService.getAllTodos();
    }),

  getById: appProcedure
    .route({
      method: 'GET',
      path: `${API_TODO_PREFIX}/:id`,
      summary: 'Get todo by ID',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(todoSchema)
    .handler(async ({ input }) => {
      return todoService.getTodoById(input.id);
    }),

  create: appProcedure
    .route({
      method: 'POST',
      path: API_TODO_PREFIX,
      summary: 'Create a todo',
      tags
    })
    .input(z.object({ text: z.string() }))
    .output(todoSchema)
    .handler(async ({ input }) => {
      return todoService.createTodo(input.text);
    }),

  update: appProcedure
    .route({
      method: 'PUT',
      path: `${API_TODO_PREFIX}/:id`,
      summary: 'Update a todo',
      tags
    })
    .input(todoSchema)
    .output(todoSchema)
    .handler(async ({ input }) => {
      const { id, ...updates } = input;
      return todoService.updateTodo(id, updates);
    }),

  delete: appProcedure
    .route({
      method: 'DELETE',
      path: `${API_TODO_PREFIX}/:id`,
      summary: 'Delete a todo',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .handler(async ({ input }) => {
      return todoService.deleteTodo(input.id);
    })
});
```

#### Service Pattern

```typescript
// src/features/todos/server/services/todo.service.ts
import 'server-only';

import { ORPCError } from '@orpc/server';
import TodoCollection from '@/collections/todo.collection';
import type { Todo } from '@/models/todo.model';

export async function getAllTodos(): Promise<Todo[]> {
  return (await TodoCollection.find()).reverse();
}

export async function getTodoById(id: string): Promise<Todo> {
  try {
    return await TodoCollection.findById(id).orFail();
  } catch {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Todo Not Found',
      data: { id }
    });
  }
}

export async function createTodo(text: string): Promise<Todo> {
  return new TodoCollection({ text, completed: false }).save();
}
```

Key rules:
- All server code lives in `server/` directory
- All files in `server/` MUST have `import 'server-only'` at the top
- This prevents accidental imports from client components (build will fail)
- Never import server code directly into client components
- Routers define `.route({ method, path, summary, tags })` for OpenAPI generation
- Services throw `ORPCError` for API errors (not generic Error)
- Use API prefix constants (e.g., `const API_TODO_PREFIX = '/todos'`)

### API Layer (ORPC)

All API requests go through a single catch-all route at `src/app/api/[[...rest]]/route.ts`. ORPC provides end-to-end type safety:

1. Define procedures in `features/*/server/routers.ts` with Zod schemas
2. Register in `src/lib/orpc/router.ts`
3. Client uses auto-generated types via `@orpc/tanstack-query` hooks

#### User Identification (sid)

The current user's ID (`sid`) is available in ORPC handlers via `context.sid`. It's extracted from the client certificate DN header (or `DEV_USER` env var in development).

```typescript
// In router handlers - access sid from context
.handler(async ({ context }) => {
  const userId = context.sid;  // Current user's ID
  return myService.getData(userId);
})

// In services - pass sid as parameter
export async function getData(sid: string): Promise<Data> {
  return DataCollection.findOne({ sid });
}
```

The context is created in `src/lib/orpc/context.ts` and provides `{ req, sid }` to all handlers.

### Data Fetching Hooks Pattern (CRITICAL)

**ALL API calls MUST use hooks with `@orpc/tanstack-query`. Never call APIs directly.**

```typescript
// Query hook pattern - src/features/todos/hooks/useTodosQuery.ts
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useTodosQuery = () => {
  return useQuery(orpc.todo.getAll.queryOptions());
};

// With input parameters
export const useTodoQuery = (id: string) => {
  return useQuery(orpc.todo.getById.queryOptions({ input: { id } }));
};
```

```typescript
// Mutation hook pattern - src/features/todos/hooks/useTodoCreateMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

export const useTodosCreateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.todo.create.mutationOptions({
      onMutate: () => ({ toastId: toast.loading('Creating...') }),
      onSuccess: async (_data, _variables, context) => {
        await queryClient.invalidateQueries({ queryKey: orpc.todo.getAll.queryKey() });
        toast.success('Created', { id: context?.toastId });
      },
      onError: (_error, _variables, context) => {
        toast.error('Failed', { id: context?.toastId });
      }
    })
  );
};
```

Key rules:
- Use `orpc.[feature].[method].queryOptions()` for queries
- Use `orpc.[feature].[method].mutationOptions()` for mutations
- **CRITICAL**: Use `orpc.[feature].[method].queryKey()` (not `.key()`) for `getQueryData`, `setQueryData`, and `invalidateQueries`. The `.queryKey()` method includes `type: "query"` which is required to match the cache key format used by `useQuery`.
- Show toast notifications for loading/success/error states

### View/Component Pattern

Views are client components that use hooks and compose feature components:

```typescript
// src/features/todos/views/todos-view.component.tsx
'use client';

import TodoListComponent from '@/features/todos/components/todo-list.component';
import TodoCreateComponent from '@/features/todos/components/todo-create.component';

const TodosViewComponent = () => {
  return (
    <div className="container mx-auto flex h-full max-w-4xl flex-col gap-y-7 p-6">
      <TodoCreateComponent />
      <TodoListComponent />
    </div>
  );
};
export default TodosViewComponent;
```

Components use hooks for data and mutations:

```typescript
// src/features/todos/components/todo-list.component.tsx
'use client';

import { useTodosQuery } from '@/features/todos/hooks/useTodosQuery';
import { useTodosDeleteMutation } from '@/features/todos/hooks/useTodoDeleteMutation';

const TodoListComponent = () => {
  const { data: todos, isPending } = useTodosQuery();
  const { mutate: todoDelete } = useTodosDeleteMutation();
  // ... render using Shadcn/ui components
};
```

### Form Handling Pattern (CRITICAL)

**All forms MUST use React Hook Form + Zod + Shadcn Form components.**

```typescript
// src/features/todos/components/todo-create.component.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTodosCreateMutation } from '@/features/todos/hooks/useTodoCreateMutation';

// Define form schema (can be inline or imported from models)
const todoCreateSchema = z.object({
  text: z.string().min(1, 'Text is required')
});

type TodoCreateForm = z.infer<typeof todoCreateSchema>;

const TodoCreateComponent = () => {
  const { mutate: todoCreate, isPending } = useTodosCreateMutation();

  const form = useForm<TodoCreateForm>({
    resolver: zodResolver(todoCreateSchema),
    defaultValues: { text: '' }
  });

  const onSubmit = (data: TodoCreateForm) => {
    todoCreate({ text: data.text });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          Create
        </Button>
      </form>
    </Form>
  );
};
```

Key rules:
- Always use `react-hook-form` with `zodResolver` for validation
- Use Shadcn Form components: `Form`, `FormField`, `FormControl`, `FormItem`, `FormMessage`
- Define form schema with Zod (inline or from models)
- Define form type as explicit interface (NEVER use `z.infer`)
- Disable submit button while mutation is pending
- Never use uncontrolled forms or raw `<form>` elements

### State Management

- **Server state**: TanStack React Query (caching, background updates)
- **Client state**: Zustand stores in `src/stores/`

### Zustand Store Pattern (CRITICAL)

**All client-side state MUST follow the slice-based Zustand pattern.**

#### Store Organization

```
src/stores/
├── app.store.ts              # Main store combining all slices
├── files/
│   ├── files.store.ts        # Slice definition (state + actions)
│   └── files.selector.ts     # Selector hooks for components
├── open-files/
│   ├── open-files.store.ts
│   └── open-files.selector.ts
└── ui/
    ├── ui.store.ts
    └── ui.selector.ts
```

#### Slice Definition Pattern

Each feature defines state interface, actions interface, and a slice creator:

```typescript
// src/stores/files/files.store.ts
import { StateCreator } from 'zustand';

// 1. Define state interface
export interface FileTreeState {
  files: {
    structure: FolderNode;
    selectedId: string | null;
    openFolderIds: string[];
  };
}

// 2. Define actions interface
export interface FileTreeActions {
  setFileStructure: (structure: FolderNode) => void;
  setSelectedFileId: (id: string | null) => void;
  toggleFolder: (folderId: string) => void;
}

// 3. Combined slice type
export type FileTreeSlice = FileTreeState & FileTreeActions;

// 4. Slice creator with StateCreator generic
export const createFileTreeSlice: StateCreator<FileTreeSlice, [], [], FileTreeSlice> = set => ({
  // Initial state
  files: {
    structure: { id: 'root', name: 'root', children: [] },
    selectedId: null,
    openFolderIds: []
  },

  // Actions - always use immutable updates
  setFileStructure: (structure) =>
    set(state => ({ files: { ...state.files, structure } })),

  setSelectedFileId: (id) =>
    set(state => ({ files: { ...state.files, selectedId: id } })),

  toggleFolder: (folderId) =>
    set(state => ({
      files: {
        ...state.files,
        openFolderIds: state.files.openFolderIds.includes(folderId)
          ? state.files.openFolderIds.filter(id => id !== folderId)
          : [...state.files.openFolderIds, folderId]
      }
    }))
});
```

#### Main Store Composition

Combine all slices with middleware in `app.store.ts`:

```typescript
// src/stores/app.store.ts
import { create } from 'zustand';
import { devtools, createJSONStorage, persist } from 'zustand/middleware';
import { IS_DEV } from '@/const';

import { createFileTreeSlice, FileTreeSlice } from './files/files.store';
import { createUiSlice, UiSlice } from './ui/ui.store';

// Combined store type
type AppStore = FileTreeSlice & UiSlice;

// Store with middleware
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (...a) => ({
        ...createFileTreeSlice(...a),
        ...createUiSlice(...a)
      }),
      {
        name: 'app',
        storage: createJSONStorage(() => sessionStorage)
      }
    ),
    { name: 'App Store', enabled: IS_DEV }
  )
);
```

#### Selector Pattern (CRITICAL)

**Components MUST use selector hooks, never access the store directly.**

```typescript
// src/stores/files/files.selector.ts
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../app.store';
import { FileTreeSlice } from './files.store';

// State selectors - one hook per piece of state
export const useFileStructure = () =>
  useAppStore((state: FileTreeSlice) => state.files.structure);

export const useSelectedFileId = () =>
  useAppStore((state: FileTreeSlice) => state.files.selectedId);

export const useOpenFolderIds = () =>
  useAppStore((state: FileTreeSlice) => state.files.openFolderIds);

// Action selector - batch related actions with useShallow
export const useFileActions = () =>
  useAppStore(
    useShallow((state: FileTreeSlice) => ({
      setFileStructure: state.setFileStructure,
      setSelectedFileId: state.setSelectedFileId,
      toggleFolder: state.toggleFolder
    }))
  );
```

#### Component Usage

```typescript
// src/features/editor/components/file-tree.component.tsx
'use client';

import { useFileStructure, useSelectedFileId, useFileActions } from '@/stores/files/files.selector';

const FileTreeComponent = () => {
  // Get state via selector hooks
  const fileStructure = useFileStructure();
  const selectedId = useSelectedFileId();

  // Get actions via action selector
  const { setSelectedFileId, toggleFolder } = useFileActions();

  return (
    <div onClick={() => setSelectedFileId('file-1')}>
      {/* render file tree */}
    </div>
  );
};
```

#### Key Rules

1. **Slice per feature** - Each feature has its own slice file
2. **Selector per slice** - Each slice has a corresponding selector file
3. **Never access store directly** - Always use selector hooks in components
4. **Use `useShallow` for action batching** - Prevents unnecessary re-renders
5. **Immutable updates only** - Always spread state, never mutate
6. **SessionStorage persistence** - Data persists during browser session
7. **DevTools in dev only** - Enable Redux DevTools only in development

#### Adding a New Store Slice

1. Create `src/stores/<feature>/` directory
2. Create `<feature>.store.ts` with state, actions, and slice creator
3. Create `<feature>.selector.ts` with state and action selector hooks
4. Register slice in `src/stores/app.store.ts`
5. Export selectors for component use

### Data Fetching Strategy (IMPORTANT)

**This app uses CLIENT-SIDE data fetching only.**

- **NO server-side prefetching** - Do not use `prefetchQuery` in server components
- **NO React Suspense for data** - Do not use `useSuspenseQuery` or `<Suspense>` for data fetching
- **NO SSR hydration** - Do not use `HydrationBoundary` or `dehydrate`

**Components must NOT use React Query directly.** Always create custom hooks in `features/*/hooks/`.

```typescript
// WRONG - Direct React Query usage in component
const { data } = useQuery(orpc.todo.getAll.queryOptions());

// CORRECT - Use custom hooks
import { useTodosQuery } from '@/features/todos/hooks/useTodosQuery';
const { data } = useTodosQuery();
```

**Caching is disabled by default** (`staleTime: 0`). Queries that need caching should set `staleTime` individually in their hooks.

### Database

MongoDB via Mongoose. Connection singleton in `src/lib/db.ts`. The `toJSONPlugin` (applied at startup via `instrumentation.ts`) normalizes `_id` to `id`.

## Key Locations

- `src/lib/orpc/router.ts` - Main API router combining all features
- `src/lib/db.ts` - MongoDB connection singleton
- `src/models/` - Zod schemas and TypeScript interfaces
- `src/collections/` - Mongoose models
- `src/components/ui/` - Shadcn/ui components
- `src/stores/app.store.ts` - Main Zustand store combining all slices
- `src/stores/*/` - Feature-specific slices and selectors

## File Naming Conventions

- Components: `<name>.component.tsx`
- Views: `<name>-view.component.tsx`
- Query Hooks: `use<Entity>Query.ts` or `use<Entities>Query.ts` (e.g., `useTodoQuery.ts`, `useTodosQuery.ts`)
- Mutation Hooks: `use<Entity><Action>Mutation.ts` (e.g., `useTodoCreateMutation.ts`, `useTodoDeleteMutation.ts`)
- Models: `<name>.model.ts`
- Collections: `<name>.collection.ts`
- Stores: `<name>.store.ts` (both main store and slice files)
- Selectors: `<name>.selector.ts`
- Services: `<name>.service.ts`

## Adding New Features

Complete step-by-step guide for adding a new feature (e.g., "comments"):

### Step 1: Create Model and Collection

```typescript
// src/models/comment.model.ts
import { z } from 'zod';

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  createdAt: Date;
}

export const commentSchema = z.object({
  id: z.string(),
  text: z.string(),
  authorId: z.string(),
  createdAt: z.date()
});
```

```typescript
// src/collections/comment.collection.ts
import mongoose, { model, Model, Schema } from 'mongoose';
import { Comment } from '@/models/comment.model';

const commentSchema = new Schema<Comment>({
  text: { type: String, required: true },
  authorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const CommentCollection = (mongoose.models.Comment ??
  model<Comment>('Comment', commentSchema, 'comment')) as Model<Comment>;

export default CommentCollection;
```

### Step 2: Create Feature Directory Structure

```
src/features/comments/
├── server/
│   ├── routers.ts
│   └── services/
│       └── comment.service.ts
├── hooks/
│   ├── useCommentsQuery.ts
│   ├── useCommentQuery.ts
│   ├── useCommentCreateMutation.ts
│   └── useCommentDeleteMutation.ts
├── views/
│   └── comments-view.component.tsx
├── components/
│   ├── comment-list.component.tsx
│   └── comment-create.component.tsx
└── const.ts
```

### Step 3: Create Service

```typescript
// src/features/comments/server/services/comment.service.ts
import 'server-only';

import { ORPCError } from '@orpc/server';
import CommentCollection from '@/collections/comment.collection';
import type { Comment } from '@/models/comment.model';

export async function getAllComments(): Promise<Comment[]> {
  return (await CommentCollection.find()).reverse();
}

export async function getCommentById(id: string): Promise<Comment> {
  try {
    return await CommentCollection.findById(id).orFail();
  } catch {
    throw new ORPCError('BAD_REQUEST', { message: 'Comment Not Found', data: { id } });
  }
}

export async function createComment(text: string, authorId: string): Promise<Comment> {
  return new CommentCollection({ text, authorId }).save();
}

export async function deleteComment(id: string): Promise<void> {
  await CommentCollection.findByIdAndDelete(id);
}
```

### Step 4: Create Router

```typescript
// src/features/comments/server/routers.ts
import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { commentSchema } from '@/models/comment.model';
import * as commentService from '@/features/comments/server/services/comment.service';

const API_COMMENT_PREFIX = '/comments';
const tags = ['Comment'];

export const commentRouter = appProcedure.router({
  getAll: appProcedure
    .route({ method: 'GET', path: API_COMMENT_PREFIX, summary: 'Get all comments', tags })
    .output(commentSchema.array())
    .handler(async () => commentService.getAllComments()),

  create: appProcedure
    .route({ method: 'POST', path: API_COMMENT_PREFIX, summary: 'Create comment', tags })
    .input(z.object({ text: z.string(), authorId: z.string() }))
    .output(commentSchema)
    .handler(async ({ input }) => commentService.createComment(input.text, input.authorId)),

  delete: appProcedure
    .route({ method: 'DELETE', path: `${API_COMMENT_PREFIX}/:id`, summary: 'Delete comment', tags })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .handler(async ({ input }) => commentService.deleteComment(input.id))
});
```

### Step 5: Register Router

```typescript
// src/lib/orpc/router.ts
import { commentRouter } from '@/features/comments/server/routers';

export const router = {
  // ... existing routers
  comment: commentRouter
};
```

### Step 6: Create Hooks

```typescript
// src/features/comments/hooks/useCommentsQuery.ts
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useCommentsQuery = () => {
  return useQuery(orpc.comment.getAll.queryOptions());
};
```

```typescript
// src/features/comments/hooks/useCommentCreateMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

export const useCommentCreateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.comment.create.mutationOptions({
      onMutate: () => ({ toastId: toast.loading('Creating comment...') }),
      onSuccess: async (_data, _variables, context) => {
        await queryClient.invalidateQueries({ queryKey: orpc.comment.getAll.queryKey() });
        toast.success('Comment created', { id: context?.toastId });
      },
      onError: (_error, _variables, context) => {
        toast.error('Failed to create comment', { id: context?.toastId });
      }
    })
  );
};
```

### Step 7: Create Components and Views

```typescript
// src/features/comments/views/comments-view.component.tsx
'use client';

import CommentListComponent from '@/features/comments/components/comment-list.component';
import CommentCreateComponent from '@/features/comments/components/comment-create.component';

const CommentsViewComponent = () => {
  return (
    <div className="container mx-auto flex h-full max-w-4xl flex-col gap-y-7 p-6">
      <CommentCreateComponent />
      <CommentListComponent />
    </div>
  );
};

export default CommentsViewComponent;
```

### Step 8: Create Page

```typescript
// src/app/comments/page.tsx
import CommentsViewComponent from '@/features/comments/views/comments-view.component';

export default function Page() {
  return (
    <div className="bg-background flex w-full items-center justify-center">
      <CommentsViewComponent />
    </div>
  );
}
```

### Step 9: Create Constants

```typescript
// src/features/comments/const.ts
export const ROUTES = {
  COMMENTS: '/comments',
  COMMENT: (id: string) => `/comments/${id}`
} as const;
```

## Code Principles

### No Magic Values
- **Never use hardcoded values** - Extract to constants in `src/const.ts` or feature-specific `const.ts`
- **Route paths**: Define in feature-specific `const.ts` (see example below)
- **API paths**: Define as constants (e.g., `const API_TODO_PREFIX = '/todos'`)
- **Timeouts/intervals**: Use named constants (e.g., `const DEBOUNCE_MS = 300`)
- **Repeated strings**: Extract to constants or enums
- **Configuration values**: Use environment variables or config files

```typescript
// Feature route constants - src/features/todos/const.ts
export const ROUTES = {
  TODOS: '/todos',
  TODO: (id: string) => `/todos/${id}`
} as const;

// Usage in components
import { ROUTES } from '@/features/todos/const';
router.push(ROUTES.TODOS);
<Link href={ROUTES.TODO(todo.id)}>
```

```typescript
// BAD
setTimeout(() => {}, 5000);
if (status === 'active') { ... }

// GOOD
const REFRESH_INTERVAL_MS = 5000;
const Status = { ACTIVE: 'active', INACTIVE: 'inactive' } as const;
setTimeout(() => {}, REFRESH_INTERVAL_MS);
if (status === Status.ACTIVE) { ... }
```

```typescript
// BAD - God component doing everything
const UserDashboard = () => {
  // 500 lines of mixed concerns...
};

// GOOD - Split into focused components
const UserDashboard = () => (
  <div>
    <UserHeader />
    <UserStats />
    <UserActivityList />
  </div>
);
```

### One Component Per File
- Each `.component.tsx` file exports exactly ONE component
- If you need helper components, extract them to separate files

```typescript
// BAD - Multiple components in one file
// user-card.component.tsx
const UserAvatar = () => { ... };
const UserBadge = () => { ... };
const UserCard = () => { ... };
export default UserCard;

// GOOD - One component per file
// user-avatar.component.tsx → exports UserAvatar
// user-badge.component.tsx → exports UserBadge
// user-card.component.tsx → imports and uses UserAvatar, UserBadge
```

### General Principles
- **Single Responsibility**: Each function/component does one thing well
- **DRY**: Don't repeat yourself - extract common logic to utils or hooks
- **Explicit over implicit**: Clear naming, no abbreviations
- **Type everything**: Use TypeScript types/interfaces, avoid `any`
- **Handle errors**: Always handle error states in UI and API calls

### TypeScript & Zod Best Practices

**NEVER use `z.infer` - it slows down IDE autocomplete.**

```typescript
// BAD - z.infer slows IDE
const todoSchema = z.object({ id: z.string(), text: z.string() });
type Todo = z.infer<typeof todoSchema>;

// GOOD - Define interface separately
export interface Todo {
  id: string;
  text: string;
}

export const todoSchema = z.object({
  id: z.string(),
  text: z.string()
});
```

- NEVER use `z.infer` anywhere in the codebase - always define interfaces/types explicitly
- Zod schemas are for API validation in routers, not for type generation
- Keep model files simple: interfaces + Zod schemas (no `z.infer`)

## UI & Code Generation Rules (CRITICAL — MUST FOLLOW)

### Shadcn/ui Usage (HIGHEST PRIORITY)
1. **All UI MUST be built using Shadcn/ui components whenever possible.**
2. If a needed Shadcn component is missing, you MUST:
   - Install it using: `npx shadcn@latest add <component-name>`
   - Then use the installed component — DO NOT reimplement it manually.
   - **IMPORTANT**: If shadcn CLI fails with `spawn bun ENOENT`, delete `bun.lock` file first (this project uses npm, not bun).
3. DO NOT:
   - Create custom buttons, inputs, dialogs, dropdowns, or form controls if a Shadcn equivalent exists.
   - Use raw HTML (`<button>`, `<input>`, etc.) for UI unless there is no Shadcn alternative.
   - Introduce another UI library (MUI, Ant, Radix directly, etc.).
   - **NEVER manually create or regenerate Shadcn component files** - always use `npx shadcn@latest add <component-name>` to install them.

### Theming & CSS Variables (CRITICAL)

**MUST use Shadcn/Tailwind CSS variables for colors to support dark/light themes.**

```typescript
// BAD - Hardcoded colors break theming
<div className="bg-white text-black border-gray-200">
<div className="bg-[#ffffff] text-[#000000]">

// GOOD - Use CSS variables that adapt to theme
<div className="bg-background text-foreground border-border">
<div className="bg-card text-card-foreground">
<div className="bg-muted text-muted-foreground">
<div className="bg-primary text-primary-foreground">
<div className="bg-secondary text-secondary-foreground">
<div className="bg-accent text-accent-foreground">
<div className="bg-destructive text-destructive-foreground">
```

Available Shadcn CSS variables:
- `background` / `foreground` - Main page background and text
- `card` / `card-foreground` - Card backgrounds
- `muted` / `muted-foreground` - Muted/secondary elements
- `primary` / `primary-foreground` - Primary actions
- `secondary` / `secondary-foreground` - Secondary actions
- `accent` / `accent-foreground` - Accents and highlights
- `destructive` / `destructive-foreground` - Destructive actions
- `border` - Border color
- `input` - Input borders
- `ring` - Focus rings

### Styling Rules
- Use Tailwind only for layout and spacing.
- **Always use Shadcn CSS variables for colors** - never hardcode colors.
- Component visuals (buttons, cards, modals, dropdowns, forms) must come from Shadcn.
- No inline styles.
- No ad-hoc custom UI unless absolutely unavoidable (and explain why).

## Environment

- MongoDB: localhost:27017 via Docker (credentials: root/password)
- API docs: OpenAPI/Scalar UI at `/api` endpoint

## Instruction when answering the prompt
1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.
8. DO NOT BE LAZY. NEVER BE LAZY. IF THERE IS A BUG FIND THE ROOT CAUSE AND FIX IT. NO TEMPORARY FIXES. YOU ARE A SENIOR DEVELOPER. NEVER BE LAZY
9. MAKE ALL FIXES AND CODE CHANGES AS SIMPLE AS HUMANLY POSSIBLE. THEY SHOULD ONLY IMPACT NECESSARY CODE RELEVANT TO THE TASK AND NOTHING ELSE. IT SHOULD IMPACT AS LITTLE CODE AS POSSIBLE. YOUR GOAL IS TO NOT INTRODUCE ANY BUGS. IT'S ALL ABOUT SIMPLICITY