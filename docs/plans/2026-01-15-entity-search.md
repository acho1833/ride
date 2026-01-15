# Entity Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement entity search feature with mock backend, search form, paginated results, and reusable entity card component.

**Architecture:** oRPC router calls entity.service.ts (pass-through layer) which calls entity.mock-service.ts (simulates external API with in-memory data). React components use React Query hooks to fetch data. Search triggers on Enter/submit. Results display in card format with pagination always visible on top.

**Tech Stack:** Next.js, oRPC, React Query, Zod, Shadcn/ui, Tailwind CSS

---

## Key Context for Implementation

### Project Structure

This project follows a feature-based architecture. Key conventions from `CLAUDE.md`:

1. **Server code pattern**: All server-side code must be in `server/` directory with `import 'server-only'` at the top
2. **Router pattern**: Use `appProcedure` from `@/lib/orpc` with `.route()` for OpenAPI generation
3. **Hook pattern**: All API calls use React Query hooks with `orpc.[feature].[method].queryOptions()`
4. **Form pattern**: Use react-hook-form + zod + Shadcn Form components. Never use `z.infer` - define explicit interfaces
5. **Component naming**: `<name>.component.tsx` for components, `<name>-view.component.tsx` for views
6. **Theming**: Always use Shadcn CSS variables (`bg-background`, `text-foreground`, etc.) - never hardcode colors

### Existing Files to Reference

- **Router example**: `src/features/todos/server/routers.ts` - Shows oRPC router pattern
- **Service example**: `src/features/todos/server/services/todo.service.ts` - Shows service pattern with ORPCError
- **Hook example**: `src/features/todos/hooks/useTodosQuery.ts` - Shows React Query hook pattern
- **Form example**: `src/features/todos/components/todo-create.component.tsx` - Shows react-hook-form pattern
- **Main router**: `src/lib/orpc/router.ts` - Where to register new routers
- **Base procedure**: `src/lib/orpc/index.ts` - Where to add global middleware
- **Entity model**: `src/models/entity.model.ts` - Existing Entity type to extend

### Key Design Decisions

1. **Mock service layer**: `entity.mock-service.ts` simulates external API with 150 deterministic entities (75 Person + 75 Organization). This will be replaced with real API calls later.

2. **Service layer**: `entity.service.ts` converts `EntityResponse` (external API format) to `Entity` (internal model) using `toEntity()` helper. This separation allows the external API to evolve independently.

3. **Global error middleware**: Added to `src/lib/orpc/index.ts` to wrap all errors in ORPCError for consistent frontend toast handling.

4. **Form state**: `EntitySearchFormComponent` uses react-hook-form for both `name` and `types` fields. Popover open state is separate useState (UI-only).

5. **Search state**: `EntitySearchComponent` uses single `SearchState` object containing `name`, `types`, `pageNumber`, `sortDirection`, and `hasSearched`.

6. **Entity icons**: Uses Remix Icons via CSS class names (`ri-user-line`, `ri-building-2-line`) to allow future JSON externalization of icon config.

7. **Query caching**: `useEntityTypesQuery` uses `staleTime: Infinity` since entity types rarely change.

8. **Search trigger**: Search only executes after form submission (not on every keystroke). `hasSearched` flag controls whether results section is shown.

### Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production (runs lint first)
npm run lint         # Run ESLint
```

### Testing Strategy

- **Task 2**: Test API via Scalar UI at `http://localhost:3000/api`
- **Task 7**: Test form validation in isolation (temporarily wire up with console.log)
- **Task 8**: Test toolbar with mock data (temporarily wire up with console.log)
- **Task 9**: Full end-to-end testing in browser

---

## File Structure Overview

```
src/
├── models/
│   ├── entity.model.ts                             # MODIFY (add Zod schema)
│   └── entity-response.model.ts                    # NEW
│
├── features/
│   ├── entity-search/
│   │   ├── server/
│   │   │   ├── routers.ts                          # NEW
│   │   │   └── services/
│   │   │       ├── entity.service.ts               # NEW
│   │   │       └── entity.mock-service.ts          # NEW
│   │   ├── hooks/
│   │   │   ├── useEntitySearchQuery.ts             # NEW
│   │   │   └── useEntityTypesQuery.ts              # NEW
│   │   ├── components/
│   │   │   ├── entity-search.component.tsx         # MODIFY
│   │   │   ├── entity-search-form.component.tsx    # NEW
│   │   │   ├── entity-search-results.component.tsx # NEW
│   │   │   └── entity-search-toolbar.component.tsx # NEW
│   │   ├── const.ts                                # NEW
│   │   └── types.ts                                # NEW
│   │
│   └── entity-card/
│       └── components/
│           └── entity-card.component.tsx           # NEW
│
├── lib/
│   └── orpc/
│       ├── router.ts                               # MODIFY
│       └── index.ts                                # MODIFY (add error middleware)
│
└── utils/
    └── util.tsx                                    # NEW
```

**Summary: 13 new files, 4 modified files (plus 1 Shadcn installation)**

---

## Task 0: Add Global Error Handling Middleware

**Why:** Ensures all errors are wrapped in ORPCError with consistent structure for the frontend toast component. If code throws ORPCError, use that directly. If it's any other error, wrap it in ORPCError with INTERNAL_SERVER_ERROR.

**Files:**
- Modify: `src/lib/orpc/index.ts`

### Step 1: Update index.ts with error middleware

```typescript
/**
 * ORPC Base Procedure
 *
 * Exports the base procedure with typed context for building API endpoints.
 * All feature routers should use this as their starting point.
 * Includes global error handling middleware.
 */

import { os, ORPCError } from '@orpc/server';
import type { Context } from './context';

/**
 * Global error handling middleware.
 * - If error is already ORPCError, rethrow it as-is
 * - If error is any other type, wrap it in ORPCError with INTERNAL_SERVER_ERROR
 * This ensures consistent error structure for frontend toast parsing.
 */
const errorMiddleware = os.$context<Context>().middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // If already ORPCError, rethrow as-is
    if (error instanceof ORPCError) {
      throw error;
    }
    // Wrap unknown errors in ORPCError for consistent frontend handling
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
});

/** Base procedure with app context and error handling - use this to define all API endpoints */
export const appProcedure = errorMiddleware;
```

### Step 2: Manual Test

1. Start dev server: `npm run dev`
2. Temporarily add `throw new Error('test error')` to any service
3. Call the endpoint via Scalar UI at `/api`
4. Verify response is `{ "message": "test error" }` with status 500

---

## Task 1: Create Mock Service, Models, and Types

**Why:** Foundation layer - the mock service simulates the external API and provides deterministic test data. EntityResponse model represents the external API response format. Types define the contract for all layers.

**Files:**
- Create: `src/models/entity-response.model.ts`
- Create: `src/features/entity-search/types.ts`
- Create: `src/features/entity-search/const.ts`
- Create: `src/features/entity-search/server/services/entity.mock-service.ts`

### Step 1: Create entity-response.model.ts

**File:** `src/models/entity-response.model.ts`

```typescript
import { z } from 'zod';

/**
 * EntityResponse represents the raw response from the external API.
 * This is separate from Entity to allow the external API response
 * structure to evolve independently from our internal Entity model.
 */
export interface EntityResponse {
  id: string;
  labelNormalized: string;
  type: string;
}

export const entityResponseSchema = z.object({
  id: z.string(),
  labelNormalized: z.string(),
  type: z.string()
});
```

### Step 2: Create types.ts

**File:** `src/features/entity-search/types.ts`

```typescript
import { Entity } from '@/models/entity.model';
import { EntityResponse } from '@/models/entity-response.model';

/**
 * Parameters for searching entities.
 * - name: Optional search string (case-sensitive contains match)
 * - types: Optional array of entity types to filter by (empty = all types)
 * - sortDirection: Sort order for labelNormalized ('asc' or 'desc')
 * - pageSize: Number of results per page
 * - pageNumber: Current page (1-indexed)
 */
export interface EntitySearchParams {
  name?: string;
  types?: string[];
  sortDirection: 'asc' | 'desc';
  pageSize: number;
  pageNumber: number;
}

/**
 * Response from entity search - uses our internal Entity model.
 * This is what the service layer returns to the router/hooks.
 */
export interface EntitySearchResponse {
  entities: Entity[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

/**
 * Response from mock external API - uses EntityResponse model.
 * This is what the mock service returns before conversion.
 */
export interface EntitySearchMockResponse {
  entities: EntityResponse[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
```

### Step 3: Create const.ts

**File:** `src/features/entity-search/const.ts`

```typescript
/** Default page size for entity search results */
export const DEFAULT_PAGE_SIZE = 50;

/** Default sort direction for entity search results */
export const DEFAULT_SORT_DIRECTION = 'asc' as const;
```

### Step 4: Create entity.mock-service.ts

**File:** `src/features/entity-search/server/services/entity.mock-service.ts`

```typescript
import 'server-only';

import { EntityResponse } from '@/models/entity-response.model';
import { EntitySearchParams, EntitySearchMockResponse } from '../../types';

/** Mock entity types - in production this would come from external API */
const MOCK_ENTITY_TYPES = ['Person', 'Organization'];

/**
 * Generates deterministic mock entity data.
 * Creates entities with predictable names like "Person 1", "Organization 1".
 * This ensures the same data is returned on every call (no randomness).
 */
function generateMockEntities(personCount: number, orgCount: number): EntityResponse[] {
  const entities: EntityResponse[] = [];

  for (let i = 1; i <= personCount; i++) {
    entities.push({
      id: `person-${i}`,
      labelNormalized: `Person ${i}`,
      type: 'Person'
    });
  }

  for (let i = 1; i <= orgCount; i++) {
    entities.push({
      id: `org-${i}`,
      labelNormalized: `Organization ${i}`,
      type: 'Organization'
    });
  }

  return entities;
}

/** In-memory mock data: 75 Person + 75 Organization = 150 total entities */
const MOCK_ENTITIES = generateMockEntities(75, 75);

/**
 * Simulates external API search endpoint.
 * - Filters by name using case-sensitive "contains" match
 * - Filters by types (empty array = no filter, returns all types)
 * - Sorts results by labelNormalized (case-insensitive) based on sortDirection
 * - Applies pagination
 */
export async function searchEntities(params: EntitySearchParams): Promise<EntitySearchMockResponse> {
  let filtered = [...MOCK_ENTITIES];

  // Filter by name (case-sensitive contains match)
  if (params.name && params.name.trim() !== '') {
    filtered = filtered.filter((e) => e.labelNormalized.includes(params.name!));
  }

  // Filter by types (empty array = show all)
  if (params.types && params.types.length > 0) {
    filtered = filtered.filter((e) => params.types!.includes(e.type));
  }

  // Sort by labelNormalized (case-insensitive) based on sortDirection
  filtered.sort((a, b) => {
    const comparison = a.labelNormalized.toLowerCase().localeCompare(b.labelNormalized.toLowerCase());
    return params.sortDirection === 'asc' ? comparison : -comparison;
  });

  // Apply pagination
  const totalCount = filtered.length;
  const startIndex = (params.pageNumber - 1) * params.pageSize;
  const paged = filtered.slice(startIndex, startIndex + params.pageSize);

  return {
    entities: paged,
    totalCount,
    pageNumber: params.pageNumber,
    pageSize: params.pageSize
  };
}

/**
 * Simulates external API endpoint to get available entity types.
 * Returns dynamic list of types from the external system.
 */
export async function getEntityTypes(): Promise<string[]> {
  return [...MOCK_ENTITY_TYPES];
}
```

### Step 5: Manual Test

**Cannot test yet** - This is server-only code. Will be testable after Task 2 (router + registration).

---

## Task 2: Create Service Layer and Router

**Why:** The entity.service.ts converts EntityResponse to Entity (pass-through for now, post-processing later). The router exposes the API endpoints via oRPC.

**Files:**
- Create: `src/features/entity-search/server/services/entity.service.ts`
- Create: `src/features/entity-search/server/routers.ts`
- Modify: `src/models/entity.model.ts`
- Modify: `src/lib/orpc/router.ts`

### Step 1: Create entity.service.ts

**File:** `src/features/entity-search/server/services/entity.service.ts`

```typescript
import 'server-only';

import { toEntity } from '@/models/entity.model';
import { EntitySearchParams, EntitySearchResponse } from '../../types';
import * as mockService from './entity.mock-service';

/**
 * Search entities - calls mock service and converts response to Entity model.
 * This service layer acts as the boundary between external API and our app.
 * Errors are handled by global error middleware in src/lib/orpc/index.ts
 */
export async function searchEntities(params: EntitySearchParams): Promise<EntitySearchResponse> {
  const mockResponse = await mockService.searchEntities(params);
  return {
    entities: mockResponse.entities.map(toEntity),
    totalCount: mockResponse.totalCount,
    pageNumber: mockResponse.pageNumber,
    pageSize: mockResponse.pageSize
  };
}

/**
 * Get available entity types from external API.
 * Errors are handled by global error middleware in src/lib/orpc/index.ts
 */
export async function getEntityTypes(): Promise<string[]> {
  return mockService.getEntityTypes();
}
```

### Step 2: Create routers.ts

**File:** `src/features/entity-search/server/routers.ts`

```typescript
import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { entitySchema } from '@/models/entity.model';
import * as entityService from './services/entity.service';

/** API path prefix for all entity endpoints */
const API_ENTITY_PREFIX = '/entities';

/** OpenAPI tags for documentation grouping */
const tags = ['Entity'];

/** Zod schema for search response validation */
const entitySearchResponseSchema = z.object({
  entities: entitySchema.array(),
  totalCount: z.number(),
  pageNumber: z.number(),
  pageSize: z.number()
});

/**
 * Entity Router - oRPC procedures for entity operations.
 * These endpoints proxy requests to the external API (currently mocked).
 */
export const entityRouter = appProcedure.router({
  /**
   * POST /entities/search - Search entities with filtering and pagination.
   * Returns paginated list of entities matching the search criteria.
   */
  search: appProcedure
    .route({
      method: 'POST',
      path: `${API_ENTITY_PREFIX}/search`,
      summary: 'Search entities with pagination',
      tags
    })
    .input(
      z.object({
        name: z.string().optional(),
        types: z.array(z.string()).optional(),
        sortDirection: z.enum(['asc', 'desc']),
        pageSize: z.number(),
        pageNumber: z.number()
      })
    )
    .output(entitySearchResponseSchema)
    .handler(async ({ input }) => {
      return entityService.searchEntities(input);
    }),

  /**
   * GET /entities/types - Get available entity types for filtering.
   * Returns array of type strings (e.g., ["Person", "Organization"]).
   */
  getTypes: appProcedure
    .route({
      method: 'GET',
      path: `${API_ENTITY_PREFIX}/types`,
      summary: 'Get available entity types',
      tags
    })
    .output(z.array(z.string()))
    .handler(async () => {
      return entityService.getEntityTypes();
    })
});
```

### Step 3: Add Zod schema and toEntity helper to entity.model.ts

**File:** `src/models/entity.model.ts`

**Why:** The router needs `entitySchema` for validation. The `toEntity` helper is reusable across the app for converting any object to Entity.

```typescript
import { z } from 'zod';
import { Coordinate } from './cooordinate.model';

/**
 * Entity represents a node in the graph (Person, Organization, etc.).
 * Extends Coordinate for optional x/y positioning when displayed in D3 graph.
 */
export type Entity = {
  id: string;
  labelNormalized: string;
  type: string;
} & Coordinate;

/** Zod schema for Entity validation in oRPC routes */
export const entitySchema = z.object({
  id: z.string(),
  labelNormalized: z.string(),
  type: z.string(),
  x: z.number().optional(),
  y: z.number().optional()
});

/**
 * Converts external API response to Entity model.
 * Note: x/y coordinates are only set internally when entities are positioned in D3 graph,
 * they are never returned from the external API.
 */
export function toEntity(response: { id: string; labelNormalized: string; type: string }): Entity {
  return {
    id: response.id,
    labelNormalized: response.labelNormalized,
    type: response.type
  };
}
```

### Step 4: Register router in main router

**File:** `src/lib/orpc/router.ts`

```typescript
import type { RouterClient } from '@orpc/server';
import { appConfigRouter } from '@/features/app-config/server/routers';
import { appSettingsRouter } from '@/features/app-settings/server/routers';
import { entityRouter } from '@/features/entity-search/server/routers';
import { filesRouter } from '@/features/files/server/routers';
import { projectRouter } from '@/features/projects/server/routers';
import { todoRouter } from '@/features/todos/server/routers';

export const router = {
  appConfig: appConfigRouter,
  appSettings: appSettingsRouter,
  entity: entityRouter,
  files: filesRouter,
  project: projectRouter,
  todo: todoRouter
};

export type AppRouterClient = RouterClient<typeof router>;
```

### Step 5: Manual Test

1. Start dev server: `npm run dev`
2. Open browser to: `http://localhost:3000/api`
3. Find "Entity" section in Scalar UI
4. Test `POST /entities/search` with body:
   ```json
   { "sortDirection": "asc", "pageSize": 10, "pageNumber": 1 }
   ```
5. Verify response contains 10 entities, totalCount = 150
6. Test `GET /entities/types` - verify returns `["Person", "Organization"]`

---

## Task 3: Create React Query Hooks

**Why:** Hooks encapsulate API calls and provide loading/error states to components.

**Files:**
- Create: `src/features/entity-search/hooks/useEntitySearchQuery.ts`
- Create: `src/features/entity-search/hooks/useEntityTypesQuery.ts`

### Step 1: Create useEntitySearchQuery.ts

**File:** `src/features/entity-search/hooks/useEntitySearchQuery.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { EntitySearchParams } from '../types';

/**
 * Hook for searching entities with pagination.
 * @param params - Search parameters (name, types, pageSize, pageNumber)
 * @param enabled - Whether to execute the query (default: true)
 * @returns Query result with entities, loading state, and pagination info
 */
export const useEntitySearchQuery = (params: EntitySearchParams, enabled: boolean = true) => {
  return useQuery({
    ...orpc.entity.search.queryOptions({ input: params }),
    enabled
  });
};
```

### Step 2: Create useEntityTypesQuery.ts

**File:** `src/features/entity-search/hooks/useEntityTypesQuery.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Hook for fetching available entity types.
 * Used to populate the type filter dropdown in search form.
 * Cached indefinitely (staleTime: Infinity) since entity types rarely change.
 * @returns Query result with array of type strings
 */
export const useEntityTypesQuery = () => {
  return useQuery({
    ...orpc.entity.getTypes.queryOptions(),
    staleTime: Infinity
  });
};
```

### Step 3: Manual Test

**Cannot test directly** - Hooks require component context. Will be testable after Task 9.

---

## Task 4: Install Remix Icons and Create Global Utility

**Why:** Entity icons will be reused across the app (entity cards, graph nodes, etc.). Using Remix Icons with CSS class names allows icon configuration to be externalized to JSON later.

**Files:**
- Create: `src/utils/util.tsx`

### Step 1: Install Remix Icons

```bash
npm install remixicon
```

### Step 2: Import Remix Icons CSS in layout

**File:** `src/app/layout.tsx`

Add this import at the top of the file:

```typescript
import 'remixicon/fonts/remixicon.css';
```

### Step 3: Create util.tsx

**File:** `src/utils/util.tsx`

```typescript
/**
 * Entity type icon configuration.
 * Maps entity types to Remix Icon CSS class names.
 * This configuration will be externalized to a JSON file in the future.
 */
const ENTITY_ICON_CONFIG: Record<string, string> = {
  Person: 'ri-user-line',
  Organization: 'ri-building-2-line'
};

/** Default icon when entity type is not found in config */
const DEFAULT_ENTITY_ICON = 'ri-question-line';

/**
 * Returns the Remix Icon CSS class name for an entity type.
 * Used for consistent entity type visualization across the app
 * (entity cards, graph nodes, etc.).
 *
 * @param type - Entity type string (e.g., "Person", "Organization")
 * @returns Remix Icon CSS class name
 */
export function getEntityIconClass(type: string): string {
  return ENTITY_ICON_CONFIG[type] ?? DEFAULT_ENTITY_ICON;
}
```

### Step 4: Manual Test

**Partial test possible after completing this task:**
1. Start dev server: `npm run dev`
2. Open browser to `http://localhost:3000`
3. Open browser DevTools (F12) → Console
4. Type: `document.querySelector('link[href*="remixicon"]')`
5. Verify result is not null (CSS is loaded)
6. Create a test `<i class="ri-user-line"></i>` element in DevTools → Elements panel
7. Verify the icon displays correctly

**Full visual test** - Will be visible when entity cards render in Task 9.

---

## Task 5: Create Entity Card Feature

**Why:** Reusable card component for displaying entities. Accepts className and onClick for flexibility across different contexts.

**Files:**
- Create: `src/features/entity-card/components/entity-card.component.tsx`

### Step 1: Create entity-card.component.tsx

**File:** `src/features/entity-card/components/entity-card.component.tsx`

```typescript
'use client';

import { Entity } from '@/models/entity.model';
import { Card } from '@/components/ui/card';
import { getEntityIconClass } from '@/utils/util';
import { cn } from '@/lib/utils';

interface Props {
  entity: Entity;
  /** Optional CSS classes to override default styles */
  className?: string;
  /** Optional click handler - behavior varies by context (search, graph, etc.) */
  onClick?: (entity: Entity) => void;
}

/**
 * Reusable entity card component.
 * Displays entity icon (Remix Icon), name, and type in a card layout.
 * Used in entity search results and potentially other areas of the app.
 */
const EntityCardComponent = ({ entity, className, onClick }: Props) => {
  const iconClass = getEntityIconClass(entity.type);

  return (
    <Card
      className={cn(
        'flex cursor-pointer items-center gap-x-2 p-2 hover:bg-accent',
        className
      )}
      onClick={() => onClick?.(entity)}
    >
      {/* Entity type icon (Remix Icon) */}
      <i className={cn('text-muted-foreground flex-shrink-0 text-base', iconClass)} />

      {/* Entity info */}
      <div className="flex flex-col overflow-hidden">
        <span className="truncate text-sm">{entity.labelNormalized}</span>
        <span className="text-muted-foreground text-xs">{entity.type}</span>
      </div>
    </Card>
  );
};

export default EntityCardComponent;
```

### Step 2: Manual Test

**Cannot test directly** - Will be visible when entity search results render in Task 9.

---

## Task 6: Install Shadcn Popover Component

**Why:** Multi-select dropdown for type filter requires popover. Shadcn popover is not installed yet.

### Step 1: Install popover

```bash
npx shadcn@latest add popover
```

**Note:** If CLI fails with `spawn bun ENOENT`, delete `bun.lock` file first.

### Step 2: Manual Test

1. Verify file exists: `src/components/ui/popover.tsx`
2. No visual test needed - component will be used in Task 7.

---

## Task 7: Create Entity Search Form Component

**Why:** Form handles name input and type multi-select filter. Uses react-hook-form with zod validation. Triggers search on form submit (Enter key or button click).

**Files:**
- Create: `src/features/entity-search/components/entity-search-form.component.tsx`

### Step 1: Create entity-search-form.component.tsx

**File:** `src/features/entity-search/components/entity-search-form.component.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react';
import { useEntityTypesQuery } from '../hooks/useEntityTypesQuery';

/** Zod schema for entity search form validation */
const entitySearchFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  types: z.array(z.string())
});

/** Form values type - explicitly defined per CLAUDE.md guidelines */
interface EntitySearchFormValues {
  name: string;
  types: string[];
}

interface Props {
  /** Callback when search is submitted (Enter key or button click) */
  onSearch: (name: string, types: string[]) => void;
}

/**
 * Entity search form with name input and type multi-select filter.
 * Uses react-hook-form with zod validation for all form state.
 * Search is triggered on form submit (Enter key or search button).
 * Empty type selection means "show all types" (no filter).
 */
const EntitySearchFormComponent = ({ onSearch }: Props) => {
  // Popover open state (UI-only, not form data)
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);

  // Fetch available entity types for the dropdown
  const { data: entityTypes = [] } = useEntityTypesQuery();

  // Initialize react-hook-form with zod validation
  const form = useForm<EntitySearchFormValues>({
    resolver: zodResolver(entitySearchFormSchema),
    defaultValues: { name: '', types: [] }
  });

  // Watch types for reactive UI updates
  const selectedTypes = form.watch('types');

  // Handle form submission
  const onSubmit = (data: EntitySearchFormValues) => {
    onSearch(data.name, data.types);
  };

  // Toggle a type in the multi-select
  const toggleType = (type: string) => {
    const current = form.getValues('types');
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    form.setValue('types', updated);
  };

  // Clear all selected types
  const clearTypes = () => {
    form.setValue('types', []);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-2">
        {/* Name search input with submit button */}
        <div className="flex items-center gap-x-1">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Search by name..."
                    className="h-7 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="ghost" size="sm" className="h-7 w-7 p-0">
            <SearchIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Type filter multi-select dropdown */}
        <div className="flex items-center gap-x-1">
          <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 justify-between text-xs">
                {selectedTypes.length === 0
                  ? 'All Types'
                  : `${selectedTypes.length} selected`}
                <ChevronDownIcon className="ml-1 h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="flex flex-col gap-y-1">
                {entityTypes.map((type) => (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-x-2 rounded p-1 hover:bg-accent"
                  >
                    <Checkbox
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={() => toggleType(type)}
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear button - only shown when types are selected */}
          {selectedTypes.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={clearTypes}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Selected types badges */}
        {selectedTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedTypes.map((type) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type}
              </Badge>
            ))}
          </div>
        )}
      </form>
    </Form>
  );
};

export default EntitySearchFormComponent;
```

### Step 2: Manual Test

**Partial test possible after completing Tasks 0-6 and this task:**

The form can be rendered and tested in isolation by temporarily importing it into entity-search.component.tsx:

1. After completing Tasks 0-6, temporarily add to `entity-search.component.tsx`:
   ```typescript
   import EntitySearchFormComponent from './entity-search-form.component';
   // In the JSX:
   <EntitySearchFormComponent onSearch={(name, types) => console.log({ name, types })} />
   ```
2. Start dev server: `npm run dev`
3. Open browser to `http://localhost:3000`
4. Click "Entity Search" icon in left toolbar
5. **Test form validation:**
   - Leave name field empty and press Enter
   - Verify "Name is required" error message appears below the input
   - Type "test" in name field and press Enter
   - Verify error clears and `{ name: "test", types: [] }` logged to console
6. **Test type filter dropdown:**
   - Click "All Types" button
   - Verify popover opens with "Person" and "Organization" checkboxes
   - Select "Person" checkbox
   - Verify button shows "1 selected" and badge appears
   - Select "Organization" checkbox
   - Verify button shows "2 selected" and two badges appear
   - Click X button to clear types
   - Verify badges disappear and button shows "All Types"
7. **Test combined submission:**
   - Type "Person 1" in name field
   - Select "Person" type
   - Press Enter or click search button
   - Verify console logs `{ name: "Person 1", types: ["Person"] }`

**Full integration test** - Will be tested in Task 9.

---

## Task 8: Create Pagination and Sort Controls Component

**Why:** Displays "Showing X-Y of Z" on the left, prev/next buttons in the middle, and sort toggle on the right. Always visible on top of results.

**Files:**
- Create: `src/features/entity-search/components/entity-search-toolbar.component.tsx`

### Step 1: Create entity-search-toolbar.component.tsx

**File:** `src/features/entity-search/components/entity-search-toolbar.component.tsx`

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon, ArrowUpAZIcon, ArrowDownZAIcon } from 'lucide-react';

interface Props {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  sortDirection: 'asc' | 'desc';
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when sort direction changes */
  onSortChange: (direction: 'asc' | 'desc') => void;
}

/**
 * Toolbar with pagination controls and sort toggle.
 * Layout: [Result count] [Prev/Next] [Sort toggle]
 * Displayed at the top of search results (always visible).
 */
const EntitySearchToolbarComponent = ({
  pageNumber,
  pageSize,
  totalCount,
  sortDirection,
  onPageChange,
  onSortChange
}: Props) => {
  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endItem = Math.min(pageNumber * pageSize, totalCount);

  // Determine if navigation is possible
  const canGoPrev = pageNumber > 1;
  const canGoNext = pageNumber < totalPages;

  // Toggle sort direction
  const handleSortToggle = () => {
    onSortChange(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex items-center justify-between">
      {/* Result count info */}
      <span className="text-muted-foreground text-xs">
        Showing {startItem}-{endItem} of {totalCount}
      </span>

      {/* Navigation and sort buttons */}
      <div className="flex items-center gap-x-1">
        {/* Pagination buttons */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          disabled={!canGoPrev}
          onClick={() => onPageChange(pageNumber - 1)}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          disabled={!canGoNext}
          onClick={() => onPageChange(pageNumber + 1)}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>

        {/* Sort toggle button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleSortToggle}
          title={sortDirection === 'asc' ? 'Sort A-Z' : 'Sort Z-A'}
        >
          {sortDirection === 'asc' ? (
            <ArrowUpAZIcon className="h-4 w-4" />
          ) : (
            <ArrowDownZAIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default EntitySearchToolbarComponent;
```

### Step 2: Manual Test

**Partial test possible after completing Tasks 0-7 and this task:**

The toolbar can be rendered in isolation by temporarily adding it to entity-search.component.tsx:

1. After completing Tasks 0-7, temporarily add to `entity-search.component.tsx`:
   ```typescript
   import EntitySearchToolbarComponent from './entity-search-toolbar.component';
   const [page, setPage] = useState(1);
   const [sort, setSort] = useState<'asc' | 'desc'>('asc');
   // In the JSX:
   <EntitySearchToolbarComponent
     pageNumber={page}
     pageSize={10}
     totalCount={150}
     sortDirection={sort}
     onPageChange={(p) => { console.log('Page:', p); setPage(p); }}
     onSortChange={(s) => { console.log('Sort:', s); setSort(s); }}
   />
   ```
2. Start dev server: `npm run dev`
3. Open browser to `http://localhost:3000`
4. Click "Entity Search" icon in left toolbar
5. **Test pagination display:**
   - Verify "Showing 1-10 of 150" appears
   - Click next button, verify "Page: 2" logged and display updates to "Showing 11-20 of 150"
   - Click prev button, verify "Page: 1" logged and display updates back
6. **Test sort toggle:**
   - Verify A-Z icon shows (ascending)
   - Click sort button, verify "Sort: desc" logged and icon changes to Z-A
   - Click again, verify "Sort: asc" logged and icon changes back
7. **Test disabled states:**
   - When on page 1, verify prev button is disabled
   - Navigate to last page, verify next button is disabled

**Full integration test** - Will be tested in Task 9.

---

## Task 9: Create Results Component and Integrate Main Component

**Why:** Results component displays the list of entity cards. Main component orchestrates form, pagination, and results.

**Files:**
- Create: `src/features/entity-search/components/entity-search-results.component.tsx`
- Modify: `src/features/entity-search/components/entity-search.component.tsx`

### Step 1: Create entity-search-results.component.tsx

**File:** `src/features/entity-search/components/entity-search-results.component.tsx`

```typescript
'use client';

import { Entity } from '@/models/entity.model';
import EntityCardComponent from '@/features/entity-card/components/entity-card.component';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  entities: Entity[];
  isLoading: boolean;
}

/**
 * Displays entity search results as a scrollable list of cards.
 * Handles loading and empty states.
 */
const EntitySearchResultsComponent = ({ entities, isLoading }: Props) => {
  // Loading state
  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">
        Loading...
      </div>
    );
  }

  // Empty state
  if (entities.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">
        No results found
      </div>
    );
  }

  // Results list
  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-y-1 pr-2">
        {entities.map((entity) => (
          <EntityCardComponent key={entity.id} entity={entity} />
        ))}
      </div>
    </ScrollArea>
  );
};

export default EntitySearchResultsComponent;
```

### Step 2: Update entity-search.component.tsx

**File:** `src/features/entity-search/components/entity-search.component.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import { ToolbarPositions } from '@/stores/ui/ui.store';
import EntitySearchFormComponent from './entity-search-form.component';
import EntitySearchToolbarComponent from './entity-search-toolbar.component';
import EntitySearchResultsComponent from './entity-search-results.component';
import { useEntitySearchQuery } from '../hooks/useEntitySearchQuery';
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT_DIRECTION } from '../const';

interface Props {
  pos: ToolbarPositions;
}

/** Search parameters state - combined into single object for cleaner state management */
interface SearchState {
  name: string;
  types: string[];
  pageNumber: number;
  sortDirection: 'asc' | 'desc';
  hasSearched: boolean;
}

const initialSearchState: SearchState = {
  name: '',
  types: [],
  pageNumber: 1,
  sortDirection: DEFAULT_SORT_DIRECTION,
  hasSearched: false
};

/**
 * Main entity search component.
 * Orchestrates the search form, toolbar (pagination + sort), and results display.
 * Results are only shown after the first search is submitted.
 */
const EntitySearchComponent = ({ pos }: Props) => {
  // All search-related state in single object
  const [search, setSearch] = useState<SearchState>(initialSearchState);

  // Fetch search results (only when hasSearched is true)
  const { data, isPending } = useEntitySearchQuery(
    {
      name: search.name || undefined,
      types: search.types.length > 0 ? search.types : undefined,
      sortDirection: search.sortDirection,
      pageSize: DEFAULT_PAGE_SIZE,
      pageNumber: search.pageNumber
    },
    search.hasSearched
  );

  // Handle form submission - update search params and reset to page 1
  const handleSearch = (name: string, types: string[]) => {
    setSearch((prev) => ({
      ...prev,
      name,
      types,
      pageNumber: 1,
      hasSearched: true
    }));
  };

  // Handle pagination - update page number (triggers refetch)
  const handlePageChange = (page: number) => {
    setSearch((prev) => ({ ...prev, pageNumber: page }));
  };

  // Handle sort direction change - reset to page 1 when sorting changes
  const handleSortChange = (direction: 'asc' | 'desc') => {
    setSearch((prev) => ({ ...prev, sortDirection: direction, pageNumber: 1 }));
  };

  return (
    <MainPanelsComponent title="Entity Search" pos={pos}>
      <div className="flex h-full flex-col gap-y-2">
        {/* Search form (always visible) */}
        <EntitySearchFormComponent onSearch={handleSearch} />

        <Separator />

        {/* Results section (only shown after first search) */}
        {search.hasSearched && (
          <>
            {/* Toolbar with pagination and sort (always visible on top of results) */}
            <EntitySearchToolbarComponent
              pageNumber={data?.pageNumber ?? 1}
              pageSize={data?.pageSize ?? DEFAULT_PAGE_SIZE}
              totalCount={data?.totalCount ?? 0}
              sortDirection={search.sortDirection}
              onPageChange={handlePageChange}
              onSortChange={handleSortChange}
            />

            {/* Results list */}
            <EntitySearchResultsComponent
              entities={data?.entities ?? []}
              isLoading={isPending}
            />
          </>
        )}
      </div>
    </MainPanelsComponent>
  );
};

export default EntitySearchComponent;
```

### Step 3: Manual Test

1. Start dev server: `npm run dev`
2. Open browser to: `http://localhost:3000`
3. Click "Entity Search" icon in left toolbar
4. Verify search form displays with name input and type dropdown
5. Click type dropdown - verify "Person" and "Organization" appear
6. Press Enter with empty fields - verify 50 results load
7. Verify pagination shows "Showing 1-50 of 150"
8. Click next arrow - verify page changes to "Showing 51-100 of 150"
9. Type "Person 1" in name field, press Enter - verify filtered results
10. Select only "Organization" type, press Enter - verify only Organization entities show
11. Hover over entity cards - verify background color changes

---

## Verification Summary

| Task | What to Verify | How to Verify |
|------|---------------|---------------|
| Task 0 | Global error middleware | Scalar UI - trigger error and verify ORPCError response |
| Task 2 | API endpoints work | Scalar UI at `/api` - test search and getTypes endpoints |
| Task 4 | Remix Icons CSS loaded | DevTools Console - query for remixicon link tag |
| Task 6 | Popover component installed | Verify `src/components/ui/popover.tsx` exists |
| Task 7 | Form validation & type filter | Partial test - render form in isolation, test validation |
| Task 8 | Toolbar pagination & sort | Partial test - render toolbar with mock data |
| Task 9 | Full feature integration | Browser UI - complete end-to-end testing |

### Incremental Testing Strategy

Tasks can be tested incrementally as follows:

1. **After Tasks 0-2**: Test API via Scalar UI (`/api`)
2. **After Task 4**: Verify Remix Icons CSS loads in browser
3. **After Task 6**: Verify popover file exists
4. **After Task 7**: Test form validation and type filter UI in isolation
5. **After Task 8**: Test toolbar pagination and sort UI in isolation
6. **After Task 9**: Full end-to-end testing

### End-to-End Test Checklist

1. [ ] Search with empty fields returns all 150 entities (paginated)
2. [ ] Name search uses case-sensitive contains match
3. [ ] Type filter with no selection shows all types
4. [ ] Type filter with selection shows only matching types
5. [ ] Pagination shows correct "Showing X-Y of Z"
6. [ ] Previous/Next buttons work correctly
7. [ ] Previous disabled on page 1
8. [ ] Next disabled on last page
9. [ ] Entity cards show icon, name, and type
10. [ ] Entity cards have hover effect
11. [ ] Results sorted by labelNormalized ascending (case-insensitive)
