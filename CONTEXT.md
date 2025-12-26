# Project Context for AI Assistants

Use this document when prompting AI assistants to provide context about the codebase.

---

## Project Overview

A fullstack todo application built with Next.js 16 and React 19.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui, TanStack React Query 5, Zustand 5, React Hook Form, Zod
- **Backend**: ORPC (type-safe RPC), MongoDB 6, Mongoose 9
- **Dev Tools**: TypeScript 5, Jest 30, ESLint 9, Prettier 3, Docker

### Folder Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/[[...rest]]/    # Single catch-all API route (ORPC handles routing)
│   └── todos/              # Todo pages (list + detail)
├── features/               # Feature modules (feature-based architecture)
│   └── todos/
│       ├── server/         # ORPC procedure definitions
│       ├── hooks/          # React Query hooks (useTodosQuery, useTodoCreateMutation, etc.)
│       ├── views/          # Page-level components
│       └── components/     # Feature-specific components
├── components/             # Shared components
│   ├── ui/                 # Shadcn/ui primitives (button, card, form, input, etc.)
│   └── providers/          # React context providers
├── lib/
│   ├── db.ts               # MongoDB connection singleton
│   ├── orpc/               # ORPC client/server setup
│   └── query/              # React Query client configuration
├── models/                 # Zod schemas and TypeScript interfaces
├── collections/            # Mongoose models
└── stores/                 # Zustand stores
```

### Key Patterns

1. **ORPC for API**: All API routes go through `/api/[[...rest]]/route.ts`. Define procedures in `features/*/server/routers.ts` and register in `lib/orpc/router.ts`.

2. **Feature-based organization**: Each feature has its own folder with server, hooks, views, and components.

3. **React Query + ORPC**: Hooks in `features/*/hooks/` use `@orpc/tanstack-query` for type-safe data fetching.

4. **Shadcn/ui components**: Located in `components/ui/`. Add new components via `npx shadcn@latest add <component>`.

5. **Zod validation**: Schemas defined in `models/` are used for both client and server validation.

## Common Tasks

### Adding a new feature

1. Create folder `src/features/<feature-name>/`
2. Add server procedures in `server/routers.ts`
3. Register router in `src/lib/orpc/router.ts`
4. Create React Query hooks in `hooks/`
5. Build views and components

### Adding an ORPC procedure

```typescript
// In features/<feature>/server/routers.ts
import { publicProcedure } from '@/lib/orpc';
import { z } from 'zod';

export const myRouter = {
  myProcedure: publicProcedure.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
    // Implementation
  })
};
```

### Creating a React Query hook

```typescript
// In features/<feature>/hooks/useMyQuery.ts
import { orpc } from '@/lib/orpc/orpc'
import { useQuery } from '@tanstack/react-query'

export function useMyQuery() {
  return useQuery(orpc.<feature>.<procedure>.queryOptions())
}
```

### Adding a Shadcn/ui component

```bash
npx shadcn@latest add <component-name>
```

## File Naming Conventions

- Components: `<name>.component.tsx`
- Hooks: `use<Name>.ts`
- Views: `<name>-view.component.tsx`
- Models: `<name>.model.ts`
- Collections: `<name>.collection.ts`
- Stores: `<Name>.store.ts`

## Environment

- MongoDB runs via Docker on port 27017
- Default credentials: root/password
- Start with: `docker-compose up -d`

## Important Files

- `src/lib/orpc/router.ts` - Main API router
- `src/lib/db.ts` - Database connection
- `src/app/layout.tsx` - Root layout with providers
- `src/components/providers/providers.tsx` - Context providers setup
