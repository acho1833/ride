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

### Feature-Based Organization

Code is organized by feature in `src/features/`. Each feature contains:
- `server/routers.ts` - ORPC procedure definitions. It should just validate the input and output.  Deletegate the business logic to services in services folder
- `hooks/` - React Query hooks using `@orpc/tanstack-query`
- `views/` - Page-level components
- `components/` - Feature-specific components
- `services/` - Feature-specific components
- `types.ts` - Feature-specific types
- `utls.ts` - Feature-specific utils

### API Layer (ORPC)

All API requests go through a single catch-all route at `src/app/api/[[...rest]]/route.ts`. ORPC provides end-to-end type safety:

1. Define procedures in `features/*/server/routers.ts` with Zod schemas
2. Register in `src/lib/orpc/router.ts`
3. Client uses auto-generated types via `@orpc/tanstack-query` hooks

### State Management

- **Server state**: TanStack React Query (caching, background updates)
- **Client state**: Zustand stores in `src/stores/`

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

### Styling Rules
- Use Tailwind only for layout and spacing.
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