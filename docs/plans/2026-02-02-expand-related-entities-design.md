# Expand Related Entities from Entity Detail Popup

## Overview

Add an "Expand" button to the entity detail popup that fetches and adds all related entities to the workspace graph. New entities start at the source entity's position and use a temporary force simulation to spread out, while existing entities remain fixed.

## User Flow

1. User double-clicks entity node → popup opens
2. Popup fetches `GET /entities/:id` to get entity with `relatedEntities`
3. Header shows: `[grip] [icon] Entity Name [Expand] [Close]`
4. Expand button states:
   - **Enabled** — Some related entities not in workspace
   - **Disabled** — All related entities already in workspace (or none exist)
   - **Loading** — While adding entities
5. User clicks Expand → filters out entities already in workspace → calls `POST /workspaces/:workspaceId/entities`
6. New entities appear at source entity's position, simulate briefly to spread out, then stop
7. Existing entities never move

## API

### New Endpoint: `GET /entities/:id`

**Response:**
```typescript
{
  id: string;
  labelNormalized: string;
  type: string;
  relatedEntities?: Record<string, Entity>;  // entityId -> { id, labelNormalized, type }
}
```

### Existing Endpoint: `POST /workspaces/:workspaceId/entities`

Already exists — adds entity IDs to workspace, backend handles deduplication.

---

## Implementation Plan

### Step 1: Update Entity Model

**File:** `src/models/entity.model.ts`

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
  /** Related entities map - only populated when fetching single entity details */
  relatedEntities?: Record<string, Entity>;
} & Coordinate;

/** Base entity schema without relatedEntities (used for recursive definition) */
const baseEntitySchema = z.object({
  id: z.string(),
  labelNormalized: z.string(),
  type: z.string(),
  x: z.number().optional(),
  y: z.number().optional()
});

/** Zod schema for Entity validation in oRPC routes */
export const entitySchema = baseEntitySchema.extend({
  relatedEntities: z.record(z.string(), baseEntitySchema).optional()
});

/**
 * Converts external API response to Entity model.
 * Note: x/y coordinates are only set internally when entities are positioned in D3 graph,
 * they are never returned from the external API.
 */
export function toEntity(response: {
  id: string;
  labelNormalized: string;
  type: string;
  relatedEntities?: Record<string, Entity>;
}): Entity {
  return {
    id: response.id,
    labelNormalized: response.labelNormalized,
    type: response.type,
    relatedEntities: response.relatedEntities
  };
}
```

---

### Step 2: Update Mock Data to Export Relationships

**File:** `src/lib/mock-data/index.ts`

```typescript
export { getMockEntities, getMockEntityById, MOCK_ENTITY_TYPES, RELATIONSHIP_PREDICATES } from './entities';
export { getMockRelationships } from './relationships';
```

**File (new):** `src/lib/mock-data/relationships.ts`

```typescript
import 'server-only';

import { faker } from '@faker-js/faker';
import type { RelationshipResponse } from '@/models/workspace-response.model';
import { getMockEntities, RELATIONSHIP_PREDICATES } from './entities';

/** Random seed offset for relationships (different from entities seed) */
const FAKER_SEED = 12346;

/** Cached relationships for consistent data across services */
let cachedRelationships: RelationshipResponse[] | null = null;

/**
 * Generates deterministic mock relationships between entities.
 * Creates ~20% connectivity between entities in the pool.
 */
function generateMockRelationships(): RelationshipResponse[] {
  faker.seed(FAKER_SEED);
  const entities = getMockEntities();
  const relationships: RelationshipResponse[] = [];
  const targetCount = Math.floor(entities.length * 0.2);

  for (let i = 0; i < targetCount; i++) {
    const source = faker.helpers.arrayElement(entities);
    const target = faker.helpers.arrayElement(entities.filter(e => e.id !== source.id));
    relationships.push({
      relationshipId: faker.string.uuid(),
      predicate: faker.helpers.arrayElement([...RELATIONSHIP_PREDICATES]),
      sourceEntityId: source.id,
      relatedEntityId: target.id
    });
  }

  return relationships;
}

/**
 * Get the shared mock relationships pool.
 * Returns the same cached data on every call for consistency.
 */
export function getMockRelationships(): RelationshipResponse[] {
  if (!cachedRelationships) {
    cachedRelationships = generateMockRelationships();
  }
  return cachedRelationships;
}

/**
 * Get all relationships for a given entity ID.
 * Returns relationships where the entity is either source or target.
 */
export function getMockRelationshipsForEntity(entityId: string): RelationshipResponse[] {
  return getMockRelationships().filter(
    r => r.sourceEntityId === entityId || r.relatedEntityId === entityId
  );
}
```

---

### Step 3: Add Entity Mock Service Function

**File:** `src/features/entity-search/server/services/entity.mock-service.ts`

Add to existing file:

```typescript
import { getMockEntityById, getMockRelationships } from '@/lib/mock-data';
import type { Entity } from '@/models/entity.model';

/**
 * Get entity by ID with all related entities.
 * Returns the entity with a relatedEntities map containing all connected entities.
 */
export async function getEntityById(id: string): Promise<Entity | null> {
  const entity = getMockEntityById(id);
  if (!entity) return null;

  // Find all relationships involving this entity
  const relationships = getMockRelationships();
  const relatedEntityIds = new Set<string>();

  for (const rel of relationships) {
    if (rel.sourceEntityId === id) {
      relatedEntityIds.add(rel.relatedEntityId);
    } else if (rel.relatedEntityId === id) {
      relatedEntityIds.add(rel.sourceEntityId);
    }
  }

  // Build relatedEntities map
  const relatedEntities: Record<string, Entity> = {};
  for (const relatedId of relatedEntityIds) {
    const relatedEntity = getMockEntityById(relatedId);
    if (relatedEntity) {
      relatedEntities[relatedId] = {
        id: relatedEntity.id,
        labelNormalized: relatedEntity.labelNormalized,
        type: relatedEntity.type
      };
    }
  }

  return {
    id: entity.id,
    labelNormalized: entity.labelNormalized,
    type: entity.type,
    relatedEntities: Object.keys(relatedEntities).length > 0 ? relatedEntities : undefined
  };
}
```

---

### Step 4: Add Entity Service Function

**File:** `src/features/entity-search/server/services/entity.service.ts`

Add to existing file:

```typescript
import { ORPCError } from '@orpc/server';
import type { Entity } from '@/models/entity.model';

/**
 * Get entity by ID with related entities.
 * Returns entity with relatedEntities map populated.
 * Errors are handled by global error middleware in src/lib/orpc/index.ts
 */
export async function getEntityById(id: string): Promise<Entity> {
  const entity = await mockService.getEntityById(id);
  if (!entity) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Entity not found',
      data: { id }
    });
  }
  return entity;
}
```

---

### Step 5: Add Entity Router Endpoint

**File:** `src/features/entity-search/server/routers.ts`

Add to existing router:

```typescript
/**
 * Entity Router - oRPC procedures for entity operations.
 * These endpoints proxy requests to the external API (currently mocked).
 */
export const entityRouter = appProcedure.router({
  /**
   * GET /entities/:id - Get entity by ID with related entities.
   * Returns entity details including relatedEntities map.
   */
  getById: appProcedure
    .route({
      method: 'GET',
      path: `${API_ENTITY_PREFIX}/:id`,
      summary: 'Get entity by ID with related entities',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(entitySchema)
    .handler(async ({ input }) => {
      return entityService.getEntityById(input.id);
    }),

  // ... existing search and getTypes procedures
});
```

---

### Step 6: Create Entity Query Hook

**File (new):** `src/features/entity-search/hooks/useEntityQuery.ts`

```typescript
/**
 * Entity Query Hook
 *
 * Fetches a single entity by ID with its related entities.
 * Used by entity detail popup to show expand button.
 */

import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Hook for fetching entity details including related entities.
 * @param id - Entity ID to fetch
 * @returns Query result with entity data
 */
export const useEntityQuery = (id: string) => {
  return useQuery({
    ...orpc.entity.getById.queryOptions({ input: { id } }),
    enabled: !!id
  });
};
```

---

### Step 7: Create Entity Detail Popup Component

**File (new):** `src/features/workspace/components/entity-detail-popup.component.tsx`

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
}

const EntityDetailPopupComponent = ({
  entity,
  x,
  y,
  workspace,
  onClose,
  onDragEnd
}: Props) => {
  // Fetch entity details with related entities
  const { data: entityDetails } = useEntityQuery(entity.id);

  // Mutation for adding entities to workspace
  const { mutate: addEntities } = useWorkspaceAddEntitiesMutation();

  // Calculate if expand is disabled:
  // - Disabled while loading (no relatedEntities yet)
  // - Disabled if all related entities are already in workspace
  // - Disabled if no related entities exist
  const existingEntityIds = useMemo(
    () => new Set(workspace.entityList.map(e => e.id)),
    [workspace.entityList]
  );
  const relatedEntities = entityDetails?.relatedEntities ?? {};
  const newEntityIds = Object.keys(relatedEntities).filter(id => !existingEntityIds.has(id));
  const isExpandDisabled = newEntityIds.length === 0;

  const handleExpand = () => {
    if (newEntityIds.length > 0) {
      addEntities({ workspaceId: workspace.id, entityIds: newEntityIds });
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

---

### Step 8: Update Detail Popup Component

**File:** `src/features/workspace/components/detail-popup.component.tsx`

Add `toolbar` prop for action buttons between header and close button:

```typescript
'use client';

/**
 * Detail Popup Component
 *
 * A generic draggable popup with a dedicated drag handle in the header.
 * Content is passed via children. Positioned absolutely using container-relative coordinates.
 * Uses React.memo to prevent re-renders when position hasn't changed.
 *
 * During drag: popup moves via direct DOM manipulation (no re-renders)
 * On drop: calls onDragEnd with final position so parent can convert to SVG coords
 */

import { memo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';

interface Props {
  x: number; // Container-relative x coordinate
  y: number; // Container-relative y coordinate
  onClose: () => void;
  onDragEnd: (containerX: number, containerY: number) => void; // Called on drop with final position
  header: React.ReactNode; // Header content (icon + title)
  children?: React.ReactNode; // Optional body content
  /** Optional toolbar buttons between header and close button */
  toolbar?: React.ReactNode;
}

const DetailPopupComponent = memo(
  ({ x, y, onClose, onDragEnd, header, children, toolbar }: Props) => {
    const popupRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 }); // Initial pointer position on drag start

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, []);

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        // Offset = current pointer position - initial pointer position
        const offsetX = e.clientX - dragStartRef.current.x;
        const offsetY = e.clientY - dragStartRef.current.y;

        // Update DOM directly (no re-render)
        if (popupRef.current) {
          popupRef.current.style.left = `${x + offsetX}px`;
          popupRef.current.style.top = `${y + offsetY}px`;
        }
      },
      [x, y]
    );

    const handlePointerUp = useCallback(
      (e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        e.preventDefault();
        isDraggingRef.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        // Final offset = current pointer position - initial pointer position
        const offsetX = e.clientX - dragStartRef.current.x;
        const offsetY = e.clientY - dragStartRef.current.y;

        // On drop: tell parent the final position so it can convert to SVG coords
        onDragEnd(x + offsetX, y + offsetY);
      },
      [onDragEnd, x, y]
    );

    return (
      <div
        ref={popupRef}
        className="bg-popover text-popover-foreground absolute z-50 w-48 overflow-hidden rounded-md border shadow-md"
        style={{
          left: `${x}px`,
          top: `${y}px`
        }}
      >
        {/* Header row */}
        <div className="flex items-center gap-1 px-1">
          {/* Drag handle */}
          <div
            className="text-muted-foreground hover:text-foreground cursor-grab p-1 active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <GripVertical className="h-3 w-3" />
          </div>

          {/* Header content (icon + title) */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5">{header}</div>

          {/* Optional toolbar buttons */}
          {toolbar}

          {/* Close button */}
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Optional body content */}
        {children && <div className="border-t px-2 py-1">{children}</div>}
      </div>
    );
  }
);

DetailPopupComponent.displayName = 'DetailPopupComponent';

export default DetailPopupComponent;
```

---

### Step 9: Update Workspace Graph Component

**File:** `src/features/workspace/components/workspace-graph.component.tsx`

Add import at top:

```typescript
import EntityDetailPopupComponent from './entity-detail-popup.component';
```

Update the force simulation setup to handle new nodes. In the `useEffect` that sets up the simulation, add logic to detect new nodes and position them at an existing node's location:

```typescript
// Inside the useEffect that handles simulation updates
// Detect new nodes by comparing with previous node IDs
const prevNodeIds = new Set(nodesRef.current.map(n => n.id));
const newNodes = data.nodes.filter(n => !prevNodeIds.has(n.id));

// If there are new nodes, position them near their related entities and run simulation
if (newNodes.length > 0 && nodesRef.current.length > 0) {
  // Position each new node at a related entity that's already in the graph
  for (const node of newNodes) {
    // Find a related entity that's already in the graph
    const relatedIds = Object.keys(node.relatedEntities ?? {});
    const existingRelated = relatedIds
      .map(id => nodesRef.current.find(n => n.id === id))
      .find(n => n !== undefined);

    if (existingRelated) {
      // Start at the connected existing node
      node.x = existingRelated.x ?? 0;
      node.y = existingRelated.y ?? 0;
    } else {
      // Fallback: use first existing node or center
      const fallback = nodesRef.current[0];
      node.x = fallback?.x ?? 0;
      node.y = fallback?.y ?? 0;
    }
  }

  // Fix existing nodes in place (so simulation only moves new nodes)
  for (const node of nodesRef.current) {
    node.fx = node.x;
    node.fy = node.y;
  }

  // Run simulation briefly
  simulationRef.current.alpha(0.3).restart();

  // After simulation settles, unfix existing nodes so they can be dragged
  setTimeout(() => {
    for (const node of nodesRef.current) {
      node.fx = null;
      node.fy = null;
    }
    simulationRef.current.stop();
  }, 1000);
}
```

Update popup rendering to use `EntityDetailPopupComponent`:

```typescript
{/* Render entity detail popups - popupRenderKey forces re-render on zoom/pan */}
{openPopups.map(popup => {
  const entity = entityMap.get(popup.entityId);
  if (!entity) return null;
  const screenPos = getPopupScreenPosition(popup.svgX, popup.svgY);

  return (
    <EntityDetailPopupComponent
      key={`${popup.id}-${popupRenderKey}`}
      entity={entity}
      x={screenPos.x}
      y={screenPos.y}
      workspace={workspace}
      onClose={() => handleClosePopup(popup.id)}
      onDragEnd={(screenX, screenY) => handlePopupDragEnd(popup.id, screenX, screenY)}
    />
  );
})}
```

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/lib/mock-data/relationships.ts` | Shared mock relationships data |
| `src/features/entity-search/hooks/useEntityQuery.ts` | Query hook for `GET /entities/:id` |
| `src/features/workspace/components/entity-detail-popup.component.tsx` | Entity-specific popup with expand button and mutation |

### Modified Files

| File | Change |
|------|--------|
| `src/models/entity.model.ts` | Add optional `relatedEntities` field |
| `src/lib/mock-data/index.ts` | Export relationships functions |
| `src/features/entity-search/server/services/entity.mock-service.ts` | Add `getEntityById` function |
| `src/features/entity-search/server/services/entity.service.ts` | Add `getEntityById` function |
| `src/features/entity-search/server/routers.ts` | Add `getById` endpoint |
| `src/features/workspace/components/detail-popup.component.tsx` | Add `toolbar` prop for action buttons |
| `src/features/workspace/components/workspace-graph.component.tsx` | Use EntityDetailPopupComponent + force layout for new nodes |

---

## Todo Checklist

- [x] Step 1: Add optional `relatedEntities` field to Entity model and schema
- [x] Step 2: Export `getMockRelationships` from workspace mock service (reused existing code)
- [x] Step 3: Add `getEntityById` to entity mock service
- [x] Step 4: Add `getEntityById` to entity service
- [x] Step 5: Add `getById` endpoint to entity router
- [x] Step 6: Create `useEntityQuery` hook
- [x] Step 7: Create entity detail popup component
- [x] Step 8: Update detail popup component with toolbar prop
- [x] Step 9: Update workspace graph component to use EntityDetailPopupComponent

---

## Implementation Review

### Summary

Implemented the "Expand" button feature for entity detail popups. When clicked, it fetches related entities via the new `GET /entities/:id` endpoint and adds them to the workspace.

### Changes Made

**New Files:**
- [useEntityQuery.ts](src/features/entity-search/hooks/useEntityQuery.ts) - Query hook for fetching entity with related entities
- [entity-detail-popup.component.tsx](src/features/workspace/components/entity-detail-popup.component.tsx) - Entity-specific popup with expand button

**Modified Files:**
- [entity.model.ts](src/models/entity.model.ts) - Added optional `relatedEntities` field to Entity type and schema
- [workspace.mock-service.ts](src/features/workspace/server/services/workspace.mock-service.ts) - Exported existing `getMockRelationships` function
- [entity.mock-service.ts](src/features/entity-search/server/services/entity.mock-service.ts) - Added `getEntityById` function that builds relatedEntities map
- [entity.service.ts](src/features/entity-search/server/services/entity.service.ts) - Added `getEntityById` service function with NOT_FOUND error handling
- [routers.ts](src/features/entity-search/server/routers.ts) - Added `GET /entities/:id` endpoint
- [detail-popup.component.tsx](src/features/workspace/components/detail-popup.component.tsx) - Added optional `toolbar` prop
- [workspace-graph.component.tsx](src/features/workspace/components/workspace-graph.component.tsx) - Switched to EntityDetailPopupComponent

### Deviation from Original Plan

- **Step 2**: Instead of creating a new `relationships.ts` file, reused the existing `getMockRelationships` function in `workspace.mock-service.ts` by exporting it. This avoids code duplication.

### Not Implemented

- **Force simulation for new nodes** (Step 9 in original plan): The force-directed layout logic for positioning new entities was not implemented. Currently, new entities added via expand will use default positioning. This can be added as a follow-up enhancement.

### Build Status

✅ Build passes with no errors.
