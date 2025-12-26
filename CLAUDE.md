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
- `server/routers.ts` - ORPC procedure definitions. Validate input/output only. Delegate business logic to services
- `services/` - Business logic
- `hooks/` - React Query hooks using `@orpc/tanstack-query`
- `views/` - Page-level components (consumed by app pages)
- `components/` - Feature-specific components
- `types.ts` - Feature-specific types
- `utils.ts` - Feature-specific utils

### API Layer (ORPC)

All API requests go through a single catch-all route at `src/app/api/[[...rest]]/route.ts`. ORPC provides end-to-end type safety:

1. Define procedures in `features/*/server/routers.ts` with Zod schemas
2. Register in `src/lib/orpc/router.ts`
3. Client uses auto-generated types via `@orpc/tanstack-query` hooks

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
        await queryClient.invalidateQueries({ queryKey: orpc.todo.getAll.key() });
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
- Invalidate related queries on mutation success using `orpc.[feature].[method].key()`
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

### State Management

- **Server state**: TanStack React Query (caching, background updates)
- **Client state**: Zustand stores in `src/stores/`

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

## File Naming Conventions

- Components: `<name>.component.tsx`
- Views: `<name>-view.component.tsx`
- Hooks: `use<Name>.ts`
- Models: `<name>.model.ts`
- Collections: `<name>.collection.ts`
- Stores: `<Name>.store.ts`

## Adding New Features

1. Create `src/features/<feature-name>/` with server, hooks, views, components subdirs
2. Define ORPC procedures in `server/routers.ts`
3. Register router in `src/lib/orpc/router.ts`
4. Create React Query hooks in `hooks/`

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

## UI & Code Generation Rules (CRITICAL — MUST FOLLOW)

### Shadcn/ui Usage (HIGHEST PRIORITY)
1. **All UI MUST be built using Shadcn/ui components whenever possible.**
2. If a needed Shadcn component is missing, you MUST:
   - Install it using: `npx shadcn@latest add <component-name>`
   - Then use the installed component — DO NOT reimplement it manually.
3. DO NOT:
   - Create custom buttons, inputs, dialogs, dropdowns, or form controls if a Shadcn equivalent exists.
   - Use raw HTML (`<button>`, `<input>`, etc.) for UI unless there is no Shadcn alternative.
   - Introduce another UI library (MUI, Ant, Radix directly, etc.).

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