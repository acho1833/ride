# Related Entities Grouping Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `relatedEntities` structure to group related entities by `type` or `predicate`, with each related entity including its relationship predicate.

**Architecture:**
- External API (`EntityResponse`) returns a flat array: `relatedEntities: RelatedEntityResponse[]` where each item has `{ type: string, entity: EntityResponse }`
- Internal model (`Entity`) groups by field: `relatedEntities: Record<string, RelatedEntity[]>`
- `entity.service.ts` transforms from flat array to grouped structure based on `groupRelatedEntitiesBy` parameter
- Default grouping is by entity `type`

**Tech Stack:** TypeScript, Zod, oRPC, TanStack Query, React

---

## Task 1: Update EntityResponse Model with RelatedEntities

**Files:**
- Modify: `src/models/entity-response.model.ts`

**Step 1: Add RelatedEntityResponse and update EntityResponse**

Replace the entire file content with:

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
  /** Related entities - flat array from external API (only on getById) */
  relatedEntities?: RelatedEntityResponse[];
}

/**
 * RelatedEntityResponse from external API.
 * Contains the relationship type and the related entity.
 */
export interface RelatedEntityResponse {
  /** The relationship type/predicate (e.g., "works_for", "knows") */
  type: string;
  /** The related entity */
  entity: EntityResponse;
}

/** Base schema for entity without relatedEntities (used to avoid circular reference) */
const entityResponseBaseSchema = z.object({
  id: z.string(),
  labelNormalized: z.string(),
  type: z.string()
});

/** Schema for related entity response from external API */
export const relatedEntityResponseSchema: z.ZodType<RelatedEntityResponse> = z.object({
  type: z.string(),
  entity: z.lazy(() => entityResponseSchema)
});

/** Schema for entity response from external API */
export const entityResponseSchema: z.ZodType<EntityResponse> = entityResponseBaseSchema.extend({
  relatedEntities: z.lazy(() => relatedEntityResponseSchema.array()).optional()
});
```

**Step 2: Verify TypeScript compiles**

Run: `npm run lint`
Expected: No type errors related to entity-response.model.ts

**Step 3: Commit**

```bash
git add src/models/entity-response.model.ts
git commit -m "feat(models): add RelatedEntityResponse to EntityResponse model"
```

---

## Task 2: Update Entity Model Types and Schemas

**Files:**
- Modify: `src/models/entity.model.ts`

**Step 1: Update the Entity interface and add RelatedEntity interface**

Replace the entire file content with:

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
  /**
   * Related entities map - only populated when fetching single entity details.
   * Key is the grouping field (entity type or predicate), value is array of related entities.
   */
  relatedEntities?: Record<string, RelatedEntity[]>;
} & Coordinate;

/**
 * RelatedEntity extends Entity with the relationship predicate.
 * Used in relatedEntities map to show how entities are connected.
 */
export interface RelatedEntity extends Omit<Entity, 'relatedEntities'> {
  /** The predicate describing the relationship (e.g., "works_for", "knows") */
  predicate: string;
}

/** Base entity schema for core fields (used for recursive/nested definitions) */
const entitySchemaBase = z.object({
  id: z.string(),
  labelNormalized: z.string(),
  type: z.string(),
  x: z.number().optional(),
  y: z.number().optional()
});

/** Schema for related entities - extends base with predicate field */
export const relatedEntitySchema = entitySchemaBase.extend({
  predicate: z.string()
});

/** Zod schema for Entity validation in oRPC routes */
export const entitySchema = entitySchemaBase.extend({
  relatedEntities: z.record(z.string(), relatedEntitySchema.array()).optional()
});

/**
 * Converts external API response to Entity model (without relatedEntities).
 * Used for search results and workspace entity lists.
 * Note: x/y coordinates are only set internally when entities are positioned in D3 graph,
 * they are never returned from the external API.
 */
export function toEntity(response: {
  id: string;
  labelNormalized: string;
  type: string;
}): Entity {
  return {
    id: response.id,
    labelNormalized: response.labelNormalized,
    type: response.type
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run lint`
Expected: No type errors related to entity.model.ts

**Step 3: Commit**

```bash
git add src/models/entity.model.ts
git commit -m "refactor(models): update Entity relatedEntities structure to Record<string, RelatedEntity[]>"
```

---

## Task 3: Update Entity Router with groupRelatedEntitiesBy Parameter

**Files:**
- Modify: `src/features/entity-search/server/routers.ts`

**Step 1: Add groupRelatedEntitiesBy input parameter to getById**

Replace the entire file content with:

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
   * GET /entities/:id - Get entity by ID with related entities.
   * Returns entity details including relatedEntities map grouped by type or predicate.
   * @param id - Entity ID
   * @param groupRelatedEntitiesBy - How to group related entities: 'type' (default) or 'predicate'
   */
  getById: appProcedure
    .route({
      method: 'GET',
      path: `${API_ENTITY_PREFIX}/:id`,
      summary: 'Get entity by ID with related entities',
      tags
    })
    .input(
      z.object({
        id: z.string(),
        groupRelatedEntitiesBy: z.enum(['type', 'predicate']).optional().default('type')
      })
    )
    .output(entitySchema)
    .handler(async ({ input }) => {
      return entityService.getEntityById(input.id, input.groupRelatedEntitiesBy);
    }),

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
        name: z.string(),
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

**Step 2: Commit (after Task 4 completes to avoid type errors)**

Wait until Task 4 is complete before committing.

---

## Task 4: Update Entity Service with Grouping Transformation

**Files:**
- Modify: `src/features/entity-search/server/services/entity.service.ts`

**Step 1: Update getEntityById to transform flat array to grouped structure**

Replace the entire file content with:

```typescript
import 'server-only';

import { ORPCError } from '@orpc/server';
import { toEntity, type Entity, type RelatedEntity } from '@/models/entity.model';
import type { EntityResponse } from '@/models/entity-response.model';
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

/**
 * Transforms flat relatedEntities array from external API to grouped structure.
 * @param response - Entity response from external API with flat relatedEntities array
 * @param groupBy - How to group: 'type' groups by entity type, 'predicate' groups by relationship type
 * @returns Grouped relatedEntities map
 */
function groupRelatedEntities(
  response: EntityResponse,
  groupBy: 'type' | 'predicate'
): Record<string, RelatedEntity[]> | undefined {
  if (!response.relatedEntities || response.relatedEntities.length === 0) {
    return undefined;
  }

  const grouped: Record<string, RelatedEntity[]> = {};

  for (const rel of response.relatedEntities) {
    // Determine grouping key: entity type or relationship type (predicate)
    const key = groupBy === 'type' ? rel.entity.type : rel.type;

    if (!grouped[key]) {
      grouped[key] = [];
    }

    // Transform to RelatedEntity: map rel.type to predicate
    grouped[key].push({
      id: rel.entity.id,
      labelNormalized: rel.entity.labelNormalized,
      type: rel.entity.type,
      predicate: rel.type
    });
  }

  return grouped;
}

/**
 * Get entity by ID with related entities.
 * Transforms external API response (flat array) to grouped structure.
 * @param id - Entity ID to fetch
 * @param groupBy - How to group related entities: 'type' or 'predicate'
 */
export async function getEntityById(id: string, groupBy: 'type' | 'predicate'): Promise<Entity> {
  const response = await mockService.getEntityById(id);
  if (!response) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Entity not found',
      data: { id }
    });
  }

  return {
    id: response.id,
    labelNormalized: response.labelNormalized,
    type: response.type,
    relatedEntities: groupRelatedEntities(response, groupBy)
  };
}
```

**Step 2: Commit (after Task 5 completes to avoid type errors)**

Wait until Task 5 is complete before committing.

---

## Task 5: Update Entity Mock Service to Return Flat Array

**Files:**
- Modify: `src/features/entity-search/server/services/entity.mock-service.ts`

**Step 1: Update getEntityById to return flat relatedEntities array**

Replace the entire file content with:

```typescript
import 'server-only';

import { getMockEntities, getMockEntityById, getMockRelationships, MOCK_ENTITY_TYPES } from '@/lib/mock-data';
import type { EntityResponse, RelatedEntityResponse } from '@/models/entity-response.model';
import { EntitySearchParams, EntitySearchMockResponse } from '../../types';

/**
 * Checks if entity label matches the search pattern.
 * Supports trailing wildcard (*) for prefix matching.
 * - "Person*" matches "Person 1", "Person 2", etc.
 * - "Person" matches any label containing "Person" (contains match)
 */
function matchesNamePattern(label: string, pattern: string): boolean {
  if (pattern.endsWith('*')) {
    // Wildcard: prefix match (case-insensitive)
    const prefix = pattern.slice(0, -1).toLowerCase();
    return label.toLowerCase().startsWith(prefix);
  }
  // Default: contains match (case-insensitive)
  return label.toLowerCase().includes(pattern.toLowerCase());
}

/**
 * Simulates external API search endpoint.
 * - Filters by name: supports trailing wildcard (*) for prefix match, otherwise contains match
 * - Filters by types (empty array = no filter, returns all types)
 * - Sorts results by labelNormalized (case-insensitive) based on sortDirection
 * - Applies pagination
 */
export async function searchEntities(params: EntitySearchParams): Promise<EntitySearchMockResponse> {
  let filtered = [...getMockEntities()];

  // Filter by name (supports trailing wildcard for prefix match)
  if (params.name && params.name.trim() !== '') {
    const pattern = params.name.trim();
    filtered = filtered.filter(e => matchesNamePattern(e.labelNormalized, pattern));
  }

  // Filter by types (empty array = show all)
  if (params.types && params.types.length > 0) {
    filtered = filtered.filter(e => params.types!.includes(e.type));
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

/**
 * Get entity by ID with all related entities.
 * Returns the entity with a flat relatedEntities array (simulating external API format).
 * @param id - Entity ID to fetch
 */
export async function getEntityById(id: string): Promise<EntityResponse | null> {
  const entity = getMockEntityById(id);
  if (!entity) return null;

  // Find all relationships involving this entity
  const relationships = getMockRelationships();
  const relatedEntities: RelatedEntityResponse[] = [];

  for (const rel of relationships) {
    let relatedId: string | null = null;

    // Determine which entity is the "other" entity in this relationship
    if (rel.sourceEntityId === id) {
      relatedId = rel.relatedEntityId;
    } else if (rel.relatedEntityId === id) {
      relatedId = rel.sourceEntityId;
    }

    if (relatedId) {
      const relatedEntity = getMockEntityById(relatedId);
      if (relatedEntity) {
        // Return flat structure: { type: relationshipType, entity: EntityResponse }
        relatedEntities.push({
          type: rel.predicate,
          entity: {
            id: relatedEntity.id,
            labelNormalized: relatedEntity.labelNormalized,
            type: relatedEntity.type
          }
        });
      }
    }
  }

  return {
    id: entity.id,
    labelNormalized: entity.labelNormalized,
    type: entity.type,
    relatedEntities: relatedEntities.length > 0 ? relatedEntities : undefined
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run lint`
Expected: No type errors

**Step 3: Commit Tasks 3-5 together**

```bash
git add src/features/entity-search/server/routers.ts
git add src/features/entity-search/server/services/entity.service.ts
git add src/features/entity-search/server/services/entity.mock-service.ts
git commit -m "feat(entity): add groupRelatedEntitiesBy parameter with service-layer transformation"
```

---

## Task 6: Update useEntityQuery Hook

**Files:**
- Modify: `src/features/entity-search/hooks/useEntityQuery.ts`

**Step 1: Add optional groupRelatedEntitiesBy parameter to hook**

Replace the entire file content with:

```typescript
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Hook for fetching entity details including related entities.
 * Used by entity detail popup to show expand button.
 * @param id - Entity ID to fetch
 * @param groupRelatedEntitiesBy - How to group related entities: 'type' (default) or 'predicate'
 * @returns Query result with entity data
 */
export const useEntityQuery = (id: string, groupRelatedEntitiesBy: 'type' | 'predicate' = 'type') => {
  return useQuery({
    ...orpc.entity.getById.queryOptions({ input: { id, groupRelatedEntitiesBy } }),
    enabled: !!id
  });
};
```

**Step 2: Verify TypeScript compiles**

Run: `npm run lint`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/features/entity-search/hooks/useEntityQuery.ts
git commit -m "feat(hooks): add groupRelatedEntitiesBy parameter to useEntityQuery hook"
```

---

## Task 7: Update Entity Detail Popup Component

**Files:**
- Modify: `src/features/workspace/components/entity-detail-popup.component.tsx`

**Step 1: Fix relatedEntities consumption to work with new structure**

The key change is extracting entity IDs from the nested array structure:

```typescript
// OLD: Object.keys(relatedEntities) returned entity IDs
// NEW: Object.keys(relatedEntities) returns group keys (type or predicate)
//      We need to flatten all arrays and extract IDs
```

Replace the entire file content with:

```typescript
'use client';

/**
 * Entity Detail Popup Component
 *
 * Entity-specific popup that wraps DetailPopupComponent with:
 * - Entity header (icon + name)
 * - Entity body (type info)
 * - Expand button toolbar (adds related entities to workspace)
 *
 * Fetches entity details via API to get relatedEntities for expand functionality.
 * Shows entity info immediately from workspace data while API loads.
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Expand } from 'lucide-react';
import { useEntityQuery } from '@/features/entity-search/hooks/useEntityQuery';
import { useWorkspaceAddEntitiesMutation } from '@/features/workspace/hooks/useWorkspaceAddEntitiesMutation';
import DetailPopupComponent from './detail-popup.component';
import { EntityDetailHeader, EntityDetailBody } from './entity-detail-content.component';
import type { Entity } from '@/models/entity.model';
import type { Workspace } from '@/models/workspace.model';

interface Props {
  /** Entity data from workspace (for immediate display) */
  entity: Entity;
  /** Screen x coordinate for popup position */
  x: number;
  /** Screen y coordinate for popup position */
  y: number;
  /** Workspace data (for checking existing entities) */
  workspace: Workspace;
  /** Called when close button is clicked */
  onClose: () => void;
  /** Called when popup is dragged to new position */
  onDragEnd: (containerX: number, containerY: number) => void;
  /** Called to select entities (used for auto-selecting expanded entities) */
  onSetSelectedEntityIds: (ids: string[]) => void;
}

const EntityDetailPopupComponent = ({ entity, x, y, workspace, onClose, onDragEnd, onSetSelectedEntityIds }: Props) => {
  // Fetch entity details with related entities (grouped by type by default)
  const { data: entityDetails } = useEntityQuery(entity.id);

  // Mutation for adding entities to workspace
  const { mutate: addEntities, isPending } = useWorkspaceAddEntitiesMutation();

  // Calculate which related entities are not yet in workspace
  const existingEntityIds = useMemo(() => new Set(workspace.entityList.map(e => e.id)), [workspace.entityList]);

  // Extract all related entity IDs from the grouped structure
  // relatedEntities is Record<string, RelatedEntity[]> - flatten all arrays and get IDs
  const relatedEntities = entityDetails?.relatedEntities ?? {};
  const allRelatedIds = Object.values(relatedEntities)
    .flat()
    .map(e => e.id);
  const newEntityIds = allRelatedIds.filter(id => !existingEntityIds.has(id));
  const isExpandDisabled = isPending || newEntityIds.length === 0;

  const handleExpand = () => {
    if (newEntityIds.length > 0) {
      addEntities(
        { workspaceId: workspace.id, entityIds: newEntityIds },
        {
          onSuccess: () => {
            // Auto-select the newly added entities
            onSetSelectedEntityIds(newEntityIds);
          }
        }
      );
    }
  };

  return (
    <DetailPopupComponent
      x={x}
      y={y}
      onClose={onClose}
      onDragEnd={onDragEnd}
      header={<EntityDetailHeader entity={entity} />}
      toolbar={
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleExpand}
          disabled={isExpandDisabled}
          title="Add related entities"
        >
          <Expand className="h-3 w-3" />
        </Button>
      }
    >
      <EntityDetailBody entity={entity} />
    </DetailPopupComponent>
  );
};

export default EntityDetailPopupComponent;
```

**Step 2: Verify TypeScript compiles**

Run: `npm run lint`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/features/workspace/components/entity-detail-popup.component.tsx
git commit -m "fix(workspace): update entity detail popup to handle new relatedEntities structure"
```

---

## Task 8: Manual Testing

**Step 1: Start the development server**

Run: `npm run dev`

**Step 2: Test default grouping (by type)**

1. Open browser to http://localhost:3000
2. Navigate to a workspace
3. Add an entity to the workspace
4. Click on the entity to open the detail popup
5. Verify the expand button works (adds related entities)
6. Check browser DevTools Network tab - verify `GET /api/entities/:id` returns data grouped by type

**Step 3: Test grouping by predicate (via API directly)**

Run: `curl "http://localhost:3000/api/entities/SOME_ENTITY_ID?groupRelatedEntitiesBy=predicate"`

Expected: Response shows relatedEntities grouped by predicate keys (e.g., "works_for", "knows")

**Step 4: Verify workspace links are created correctly**

1. In the workspace, expand an entity
2. Verify that relationship lines appear connecting the new entities
3. Verify the lines represent the correct relationships (predicates)

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/models/entity-response.model.ts` | Added `RelatedEntityResponse` interface/schema for flat array from external API |
| `src/models/entity.model.ts` | Added `RelatedEntity` interface/schema, updated `Entity.relatedEntities` to grouped structure |
| `src/features/entity-search/server/routers.ts` | Added `groupRelatedEntitiesBy` query parameter |
| `src/features/entity-search/server/services/entity.service.ts` | Added `groupRelatedEntities()` transformation function |
| `src/features/entity-search/server/services/entity.mock-service.ts` | Return flat `RelatedEntityResponse[]` array |
| `src/features/entity-search/hooks/useEntityQuery.ts` | Add optional `groupRelatedEntitiesBy` parameter |
| `src/features/workspace/components/entity-detail-popup.component.tsx` | Flatten relatedEntities arrays to extract IDs |
