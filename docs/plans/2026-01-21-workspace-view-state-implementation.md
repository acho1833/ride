# Workspace View State Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist workspace viewport (scale, pan) and entity positions to MongoDB with debounced optimistic saves.

**Architecture:** MongoDB stores `WorkspaceViewState` documents linked by `workspaceId`. On load, view state is merged with external API workspace data. User interactions (drag, pan, zoom) trigger debounced saves. Mutation passed as prop to graph component.

**Tech Stack:** MongoDB/Mongoose, ORPC, React Query, D3.js, lodash-es debounce

---

## Task 1: Create WorkspaceViewState Model

**Files:**
- Create: `src/models/workspace-view-state.model.ts`

**Step 1: Create the model file with interface and Zod schema**

```typescript
import { z } from 'zod';

export interface WorkspaceViewState {
  id: string;
  workspaceId: string;
  sid: string;
  scale: number;
  panX: number;
  panY: number;
  entityPositions: Record<string, { x: number; y: number }>;
  updatedAt: Date;
}

export const workspaceViewStateSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  sid: z.string(),
  scale: z.number(),
  panX: z.number(),
  panY: z.number(),
  entityPositions: z.record(z.string(), z.object({ x: z.number(), y: z.number() })),
  updatedAt: z.date()
});

/** Input schema for saving view state (excludes id, sid, updatedAt - set by server) */
export const workspaceViewStateInputSchema = z.object({
  workspaceId: z.string(),
  scale: z.number(),
  panX: z.number(),
  panY: z.number(),
  entityPositions: z.record(z.string(), z.object({ x: z.number(), y: z.number() }))
});

export type WorkspaceViewStateInput = z.infer<typeof workspaceViewStateInputSchema>;
```

**Step 2: Verify file compiles**

Run: `npm run lint`
Expected: No errors for new file

**Step 3: Commit**

```bash
git add src/models/workspace-view-state.model.ts
git commit -m "feat: add WorkspaceViewState model"
```

---

## Task 2: Create WorkspaceViewState MongoDB Collection

**Files:**
- Create: `src/collections/workspace-view-state.collection.ts`

**Step 1: Create the Mongoose collection**

```typescript
import mongoose, { model, Model, Schema } from 'mongoose';
import type { WorkspaceViewState } from '@/models/workspace-view-state.model';

const workspaceViewStateSchema = new Schema<WorkspaceViewState>(
  {
    workspaceId: {
      type: String,
      required: true,
      unique: true
    },
    sid: {
      type: String,
      required: true
    },
    scale: {
      type: Number,
      required: true
    },
    panX: {
      type: Number,
      required: true
    },
    panY: {
      type: Number,
      required: true
    },
    entityPositions: {
      type: Schema.Types.Mixed,
      required: true,
      default: {}
    }
  },
  {
    timestamps: { createdAt: false, updatedAt: true }
  }
);

const WorkspaceViewStateCollection = (mongoose.models.WorkspaceViewState ??
  model<WorkspaceViewState>('WorkspaceViewState', workspaceViewStateSchema, 'workspaceViewState')) as Model<WorkspaceViewState>;

export default WorkspaceViewStateCollection;
```

**Step 2: Verify file compiles**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/collections/workspace-view-state.collection.ts
git commit -m "feat: add WorkspaceViewState MongoDB collection"
```

---

## Task 3: Disable Global Mutation Retries

**Files:**
- Modify: `src/lib/query/client.ts:22-35`

**Step 1: Add mutations config with retry: 0**

In `createQueryClient()`, add `mutations` to `defaultOptions`:

```typescript
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries in development for faster feedback
        retry: IS_DEV ? 0 : 1,
        // Custom hash function using ORPC serializer for consistent keys
        queryKeyHashFn(queryKey) {
          const [json, meta] = serializer.serialize(queryKey);
          return JSON.stringify({ json, meta });
        },
        // Disable caching by default - queries that need caching should set staleTime individually
        staleTime: 0
      },
      mutations: {
        // Single attempt for all mutations - no retries
        retry: 0
      },
      // ... rest unchanged
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/query/client.ts
git commit -m "config: disable mutation retries globally"
```

---

## Task 4: Add View State Service Functions

**Files:**
- Modify: `src/features/workspace/server/services/workspace.service.ts`

**Step 1: Add imports at top of file**

```typescript
import 'server-only';

import { ORPCError } from '@orpc/server';
import { toWorkspace, type Workspace } from '@/models/workspace.model';
import type { WorkspaceViewState, WorkspaceViewStateInput } from '@/models/workspace-view-state.model';
import WorkspaceViewStateCollection from '@/collections/workspace-view-state.collection';
import * as mockService from './workspace.mock-service';
```

**Step 2: Add getViewStateByWorkspaceId function**

```typescript
/**
 * Get view state for a workspace.
 * Returns null if no saved state exists.
 */
export async function getViewStateByWorkspaceId(workspaceId: string, sid: string): Promise<WorkspaceViewState | null> {
  const viewState = await WorkspaceViewStateCollection.findOne({ workspaceId });
  if (viewState && viewState.sid !== sid) {
    throw new ORPCError('FORBIDDEN', { message: 'Not authorized to access this view state' });
  }
  return viewState;
}
```

**Step 3: Add saveViewState function**

```typescript
/**
 * Save or update view state for a workspace.
 * Creates new record if none exists, updates if it does.
 */
export async function saveViewState(input: WorkspaceViewStateInput, sid: string): Promise<WorkspaceViewState> {
  const existing = await WorkspaceViewStateCollection.findOne({ workspaceId: input.workspaceId });

  if (existing) {
    if (existing.sid !== sid) {
      throw new ORPCError('FORBIDDEN', { message: 'Not authorized to modify this view state' });
    }
    existing.scale = input.scale;
    existing.panX = input.panX;
    existing.panY = input.panY;
    existing.entityPositions = input.entityPositions;
    return existing.save();
  }

  return new WorkspaceViewStateCollection({
    ...input,
    sid
  }).save();
}
```

**Step 4: Add deleteViewState function**

```typescript
/**
 * Delete view state for a workspace.
 * Called when workspace is deleted.
 */
export async function deleteViewState(workspaceId: string, sid: string): Promise<void> {
  const existing = await WorkspaceViewStateCollection.findOne({ workspaceId });
  if (existing && existing.sid !== sid) {
    throw new ORPCError('FORBIDDEN', { message: 'Not authorized to delete this view state' });
  }
  await WorkspaceViewStateCollection.deleteOne({ workspaceId });
}
```

**Step 5: Update getWorkspaceById to merge view state**

Modify the existing function to accept `sid` and merge view state:

```typescript
/**
 * Get workspace by ID with merged view state.
 */
export async function getWorkspaceById(id: string, sid: string): Promise<Workspace & { viewState: WorkspaceViewState | null }> {
  const response = await mockService.getWorkspaceById(id);
  const workspace = toWorkspace(response);
  const viewState = await getViewStateByWorkspaceId(id, sid);
  return { ...workspace, viewState };
}
```

**Step 6: Add deleteWorkspace function**

```typescript
/**
 * Delete workspace and its view state.
 */
export async function deleteWorkspace(id: string, sid: string): Promise<void> {
  // Delete from external API (mock for now - just verify it exists)
  await mockService.getWorkspaceById(id);
  // Clean up view state from MongoDB
  await deleteViewState(id, sid);
}
```

**Step 7: Verify lint passes**

Run: `npm run lint`
Expected: No errors

**Step 8: Commit**

```bash
git add src/features/workspace/server/services/workspace.service.ts
git commit -m "feat: add view state service functions"
```

---

## Task 5: Update Workspace Model for View State

**Files:**
- Modify: `src/models/workspace.model.ts`

**Step 1: Add viewState to Workspace interface and schema**

```typescript
import { z } from 'zod';
import { Entity, entitySchema, toEntity } from './entity.model';
import { Relationship, relationshipSchema } from './relationship.model';
import { ViewPreference, viewPreferenceSchema } from './view-preference.model';
import { WorkspaceViewState, workspaceViewStateSchema } from './workspace-view-state.model';
import type { WorkspaceResponse } from './workspace-response.model';

export interface Workspace {
  id: string;
  name: string;
  entityList: Entity[];
  viewPreference: ViewPreference;
  relationshipList: Relationship[];
  viewState: WorkspaceViewState | null;
}

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  entityList: entitySchema.array(),
  viewPreference: viewPreferenceSchema,
  relationshipList: relationshipSchema.array(),
  viewState: workspaceViewStateSchema.nullable()
});

/**
 * Converts external API response to Workspace model.
 */
export function toWorkspace(response: WorkspaceResponse): Omit<Workspace, 'viewState'> {
  return {
    id: response.id,
    name: response.name,
    entityList: response.entityList.map(toEntity),
    relationshipList: response.relationshipList as Relationship[],
    viewPreference: {
      scale: 1,
      coordinate: {}
    }
  };
}
```

**Step 2: Verify lint passes**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/models/workspace.model.ts
git commit -m "feat: add viewState to Workspace model"
```

---

## Task 6: Add Router Endpoints

**Files:**
- Modify: `src/features/workspace/server/routers.ts`

**Step 1: Add imports**

```typescript
import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { workspaceSchema } from '@/models/workspace.model';
import { workspaceViewStateSchema, workspaceViewStateInputSchema } from '@/models/workspace-view-state.model';
import * as workspaceService from './services/workspace.service';
```

**Step 2: Update getById handler to pass sid**

```typescript
getById: appProcedure
  .route({
    method: 'GET',
    path: `${API_WORKSPACE_PREFIX}/:id`,
    summary: 'Get workspace by ID',
    tags
  })
  .input(z.object({ id: z.string() }))
  .output(workspaceSchema)
  .handler(async ({ input, context }) => {
    return workspaceService.getWorkspaceById(input.id, context.sid);
  }),
```

**Step 3: Add saveViewState endpoint**

```typescript
saveViewState: appProcedure
  .route({
    method: 'PUT',
    path: `${API_WORKSPACE_PREFIX}/:workspaceId/view-state`,
    summary: 'Save workspace view state',
    tags
  })
  .input(workspaceViewStateInputSchema)
  .output(workspaceViewStateSchema)
  .handler(async ({ input, context }) => {
    return workspaceService.saveViewState(input, context.sid);
  }),
```

**Step 4: Add delete endpoint**

```typescript
delete: appProcedure
  .route({
    method: 'DELETE',
    path: `${API_WORKSPACE_PREFIX}/:id`,
    summary: 'Delete workspace',
    tags
  })
  .input(z.object({ id: z.string() }))
  .output(z.void())
  .handler(async ({ input, context }) => {
    return workspaceService.deleteWorkspace(input.id, context.sid);
  }),
```

**Step 5: Verify lint passes**

Run: `npm run lint`
Expected: No errors

**Step 6: Commit**

```bash
git add src/features/workspace/server/routers.ts
git commit -m "feat: add saveViewState and delete endpoints"
```

---

## Task 7: Create View State Mutation Hook

**Files:**
- Create: `src/features/workspace/hooks/useWorkspaceViewStateMutation.ts`

**Step 1: Create the mutation hook**

```typescript
/**
 * Workspace View State Mutation Hook
 *
 * Optimistic save for view state - no query invalidation needed
 * since UI already reflects the current state.
 */

import { useMutation } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

/**
 * Hook for saving workspace view state
 * @returns Mutation object with mutate function
 */
export const useWorkspaceViewStateMutation = () => {
  return useMutation(
    orpc.workspace.saveViewState.mutationOptions({
      onError: () => {
        toast.error('Failed to save view state');
      }
      // No onSuccess - optimistic update, UI already has current state
    })
  );
};
```

**Step 2: Verify lint passes**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/workspace/hooks/useWorkspaceViewStateMutation.ts
git commit -m "feat: add useWorkspaceViewStateMutation hook"
```

---

## Task 8: Update Workspace Component to Pass Mutation

**Files:**
- Modify: `src/features/workspace/components/workspace.component.tsx`

**Step 1: Import the mutation hook and add type**

```typescript
'use client';

/**
 * Workspace Component
 *
 * Data fetching wrapper for workspace graph.
 * Retrieves workspace data by workspaceId and passes to graph component.
 */

import { useWorkspaceQuery } from '../hooks/useWorkspaceQuery';
import { useWorkspaceViewStateMutation } from '../hooks/useWorkspaceViewStateMutation';
import WorkspaceGraphComponent from './workspace-graph.component';
import type { WorkspaceViewStateInput } from '@/models/workspace-view-state.model';
```

**Step 2: Use mutation hook and pass to graph component**

```typescript
const WorkspaceComponent = ({ workspaceId }: Props) => {
  const { data: workspace, isPending, isError, error } = useWorkspaceQuery(workspaceId);
  const { mutate: saveViewState } = useWorkspaceViewStateMutation();

  const handleSaveViewState = (input: Omit<WorkspaceViewStateInput, 'workspaceId'>) => {
    saveViewState({ ...input, workspaceId });
  };

  // ... loading/error states unchanged ...

  return <WorkspaceGraphComponent workspace={workspace} onSaveViewState={handleSaveViewState} />;
};
```

**Step 3: Verify lint passes**

Run: `npm run lint`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/workspace/components/workspace.component.tsx
git commit -m "feat: pass saveViewState to WorkspaceGraphComponent"
```

---

## Task 9: Add Debounce Constant

**Files:**
- Modify: `src/features/workspace/const.ts`

**Step 1: Add debounce constant to GRAPH_CONFIG**

```typescript
export const GRAPH_CONFIG = {
  /** Node circle radius in pixels */
  nodeRadius: 20,
  /** Entity icon size in pixels */
  iconSize: 32,
  /** Target distance between linked nodes */
  linkDistance: 120,
  /** Repulsion strength between nodes (negative = repel) */
  chargeStrength: -400,
  /** Strength of centering force */
  centerForce: 0.1,
  /** Zoom scale limits */
  zoomExtent: [0.1, 4] as [number, number],
  /** Zoom scale factor for buttons */
  zoomStep: 1.3,
  /** Padding around nodes when fitting to view */
  fitPadding: 50,
  /** Debounce delay for saving view state in milliseconds */
  saveDebounceMs: 500
} as const;
```

**Step 2: Commit**

```bash
git add src/features/workspace/const.ts
git commit -m "config: add saveDebounceMs to GRAPH_CONFIG"
```

---

## Task 10: Update WorkspaceGraphComponent for View State Persistence

**Files:**
- Modify: `src/features/workspace/components/workspace-graph.component.tsx`

This is the largest task. We need to:
1. Accept `onSaveViewState` prop
2. Apply saved view state on load
3. Add debounced save on drag end, zoom end, pan end
4. Save initial state when no saved state exists

**Step 1: Update imports and Props interface**

Add imports at top:

```typescript
import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { debounce } from 'lodash-es';
// ... other imports ...
import type { WorkspaceViewStateInput } from '@/models/workspace-view-state.model';
```

Update Props:

```typescript
interface Props {
  workspace: Workspace;
  onSaveViewState: (input: Omit<WorkspaceViewStateInput, 'workspaceId'>) => void;
}

const WorkspaceGraphComponent = ({ workspace, onSaveViewState }: Props) => {
```

**Step 2: Add ref to track current transform**

After existing refs:

```typescript
const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
const initialSaveRef = useRef(false);
```

**Step 3: Create collectAndSave helper and debounced save**

After the refs, before the `useMemo` for data:

```typescript
// Collect current state and save
const collectAndSave = useCallback(() => {
  const transform = transformRef.current;
  const positions: Record<string, { x: number; y: number }> = {};

  for (const node of nodesRef.current) {
    if (node.x !== undefined && node.y !== undefined) {
      positions[node.id] = { x: node.x, y: node.y };
    }
  }

  onSaveViewState({
    scale: transform.k,
    panX: transform.x,
    panY: transform.y,
    entityPositions: positions
  });
}, [onSaveViewState]);

// Debounced save function
const debouncedSave = useMemo(
  () => debounce(collectAndSave, GRAPH_CONFIG.saveDebounceMs),
  [collectAndSave]
);

// Cleanup debounce on unmount
useEffect(() => {
  return () => {
    debouncedSave.cancel();
  };
}, [debouncedSave]);
```

**Step 4: Modify the D3 initialization useEffect**

This step updates the main `useEffect` that initializes D3. Key changes:

a) Apply saved entity positions if viewState exists:

After creating nodes array, before simulation setup:

```typescript
// Deep copy data to avoid mutation issues with D3
const nodes: WorkspaceGraphNode[] = data.nodes.map(n => {
  // Apply saved position if exists
  const savedPos = workspace.viewState?.entityPositions[n.id];
  return {
    ...n,
    x: savedPos?.x ?? n.x,
    y: savedPos?.y ?? n.y
  };
});
```

b) Update zoom handler to track transform and trigger debounced save:

```typescript
.on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
  g.attr('transform', event.transform.toString());
  transformRef.current = event.transform;
  debouncedSave();
})
```

c) Update drag end handler to trigger debounced save:

```typescript
.on('end', function () {
  this.setAttribute('cursor', 'grab');
  debouncedSave();
})
```

d) Apply saved viewport transform OR calculate auto-fit, then save initial state:

Replace the auto-fit calculation section with:

```typescript
// Apply saved transform or calculate auto-fit
let initialTransform: d3.ZoomTransform;

if (workspace.viewState) {
  // Use saved viewport state
  initialTransform = d3.zoomIdentity
    .translate(workspace.viewState.panX, workspace.viewState.panY)
    .scale(workspace.viewState.scale);
} else {
  // Calculate zoom-to-fit transform
  const padding = GRAPH_CONFIG.fitPadding;
  const xExtent = d3.extent(nodes, d => d.x) as [number, number];
  const yExtent = d3.extent(nodes, d => d.y) as [number, number];

  const graphWidth = xExtent[1] - xExtent[0] + GRAPH_CONFIG.nodeRadius * 2;
  const graphHeight = yExtent[1] - yExtent[0] + GRAPH_CONFIG.nodeRadius * 2;
  const graphCenterX = (xExtent[0] + xExtent[1]) / 2;
  const graphCenterY = (yExtent[0] + yExtent[1]) / 2;

  const scale = Math.min((width - padding * 2) / graphWidth, (height - padding * 2) / graphHeight, 1);
  const translateX = width / 2 - graphCenterX * scale;
  const translateY = height / 2 - graphCenterY * scale;

  initialTransform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);

  // Save initial state (only once)
  if (!initialSaveRef.current) {
    initialSaveRef.current = true;
    // Use setTimeout to ensure nodes have positions before saving
    setTimeout(() => collectAndSave(), 0);
  }
}

transformRef.current = initialTransform;
svg.call(zoom.transform, initialTransform);
```

**Step 5: Add debouncedSave to useEffect dependencies**

Update the dependency array:

```typescript
}, [data, dimensions, workspace.viewState, debouncedSave, collectAndSave]);
```

**Step 6: Verify lint and build pass**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/features/workspace/components/workspace-graph.component.tsx
git commit -m "feat: add view state persistence to WorkspaceGraphComponent"
```

---

## Task 11: Manual Testing

**Step 1: Start development server**

Run: `docker-compose up -d && npm run dev`

**Step 2: Test save on entity drag**

1. Open a workspace
2. Drag an entity node
3. Check MongoDB for saved view state:
   Run: `npm run mongo-gui` (opens http://localhost:3091)
   Navigate to `workspaceViewState` collection
   Expected: Document with entity positions

**Step 3: Test save on zoom/pan**

1. Ctrl+scroll to zoom
2. Ctrl+drag to pan
3. Verify MongoDB document updates with new scale/panX/panY

**Step 4: Test restore on reload**

1. Refresh the page
2. Expected: Graph loads with saved positions and viewport

**Step 5: Test initial save for new workspace**

1. Open a workspace that has no saved view state
2. Expected: Auto-fit viewport, then save to MongoDB

---

## Task 12: Final Commit

**Step 1: Verify all changes**

Run: `git status`
Expected: All changes committed

Run: `npm run build`
Expected: Build succeeds

**Step 2: Create summary commit if needed**

If any uncommitted changes remain:

```bash
git add -A
git commit -m "feat: workspace view state persistence complete"
```

---

## Summary

Tasks completed:
1. ✅ WorkspaceViewState model
2. ✅ MongoDB collection with unique workspaceId index
3. ✅ Global mutation retry disabled
4. ✅ Service functions for CRUD operations
5. ✅ Updated Workspace model with viewState
6. ✅ Router endpoints (saveViewState, delete)
7. ✅ Mutation hook
8. ✅ WorkspaceComponent passes mutation
9. ✅ Debounce constant
10. ✅ WorkspaceGraphComponent with persistence
11. ✅ Manual testing
12. ✅ Final verification
