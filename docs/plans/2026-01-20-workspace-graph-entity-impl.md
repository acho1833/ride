# Workspace Graph Entity Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor workspace graph to use Entity model with real data fetching instead of hardcoded sample data.

**Architecture:** Create a data fetching wrapper (`WorkspaceComponent`) that retrieves file metadata from Zustand, fetches workspace data via ORPC, and passes it to a pure presentational `WorkspaceGraphComponent`. The mock service maintains per-workspace state in a hashmap to support future add/remove operations.

**Tech Stack:** React, Zustand, ORPC, TanStack Query, D3.js, Zod, Faker.js

---

## Task 1: Create Workspace Response Model

**Files:**
- Create: `src/models/workspace-response.model.ts`

**Step 1: Create the model file**

```typescript
// src/models/workspace-response.model.ts
import { z } from 'zod';
import { entityResponseSchema } from './entity-response.model';

/**
 * Relationship from external API.
 */
export interface RelationshipResponse {
  relationshipId: string;
  predicate: string;
  sourceEntityId: string;
  relatedEntityId: string;
}

export const relationshipResponseSchema = z.object({
  relationshipId: z.string(),
  predicate: z.string(),
  sourceEntityId: z.string(),
  relatedEntityId: z.string()
});

/**
 * Workspace response from external API.
 * Does not include viewPreference - that's stored in our DB.
 */
export interface WorkspaceResponse {
  id: string;
  name: string;
  entityList: z.infer<typeof entityResponseSchema>[];
  relationshipList: RelationshipResponse[];
}

export const workspaceResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  entityList: entityResponseSchema.array(),
  relationshipList: relationshipResponseSchema.array()
});
```

**Step 2: Verify file created**

Run: `cat src/models/workspace-response.model.ts`
Expected: File contents displayed

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 4: Commit**

```bash
git add src/models/workspace-response.model.ts
git commit -m "feat(models): add workspace response model for external API"
```

---

## Task 2: Create Workspace Mock Service

**Files:**
- Create: `src/features/workspace/server/services/workspace.mock-service.ts`

**Step 1: Create the directory structure**

Run: `mkdir -p src/features/workspace/server/services`

**Step 2: Create the mock service**

```typescript
// src/features/workspace/server/services/workspace.mock-service.ts
import 'server-only';

import { faker } from '@faker-js/faker';
import type { EntityResponse } from '@/models/entity-response.model';
import type { WorkspaceResponse, RelationshipResponse } from '@/models/workspace-response.model';

const FAKER_SEED = 12345;
const MOCK_ENTITY_TYPES = ['Person', 'Organization'];
const RELATIONSHIP_PREDICATES = ['works_for', 'knows', 'manages', 'reports_to', 'collaborates_with'];

// ============================================================================
// Global mock data pool (all available entities and relationships)
// ============================================================================

let cachedEntities: EntityResponse[] | null = null;
let cachedRelationships: RelationshipResponse[] | null = null;

function generateMockEntities(): EntityResponse[] {
  faker.seed(FAKER_SEED);
  const entities: EntityResponse[] = [];
  for (const type of MOCK_ENTITY_TYPES) {
    for (let i = 0; i < 300; i++) {
      entities.push({
        id: faker.string.uuid(),
        labelNormalized: type === 'Person' ? faker.person.fullName() : faker.company.name(),
        type
      });
    }
  }
  return entities;
}

function generateMockRelationships(entities: EntityResponse[]): RelationshipResponse[] {
  faker.seed(FAKER_SEED + 1);
  const relationships: RelationshipResponse[] = [];
  const targetCount = Math.floor(entities.length * 0.2);
  for (let i = 0; i < targetCount; i++) {
    const source = faker.helpers.arrayElement(entities);
    const target = faker.helpers.arrayElement(entities.filter(e => e.id !== source.id));
    relationships.push({
      relationshipId: faker.string.uuid(),
      predicate: faker.helpers.arrayElement(RELATIONSHIP_PREDICATES),
      sourceEntityId: source.id,
      relatedEntityId: target.id
    });
  }
  return relationships;
}

function getMockData(): { entities: EntityResponse[]; relationships: RelationshipResponse[] } {
  if (!cachedEntities || !cachedRelationships) {
    cachedEntities = generateMockEntities();
    cachedRelationships = generateMockRelationships(cachedEntities);
  }
  return { entities: cachedEntities, relationships: cachedRelationships };
}

// ============================================================================
// Per-workspace state (hashmap of workspace ID -> entities + relationships)
// ============================================================================

interface WorkspaceState {
  entityList: EntityResponse[];
  relationshipList: RelationshipResponse[];
}

const workspaceStateMap = new Map<string, WorkspaceState>();

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get or initialize workspace state.
 * On first access, generates initial subset of entities.
 */
function getWorkspaceState(workspaceId: string): WorkspaceState {
  if (!workspaceStateMap.has(workspaceId)) {
    const { entities, relationships } = getMockData();

    // Use workspace ID as seed for consistent initial subset
    faker.seed(hashString(workspaceId));
    const entityCount = faker.number.int({ min: 5, max: 10 });
    const selectedEntities = faker.helpers.arrayElements(entities, entityCount);
    const entityIds = new Set(selectedEntities.map(e => e.id));

    const selectedRelationships = relationships.filter(
      r => entityIds.has(r.sourceEntityId) && entityIds.has(r.relatedEntityId)
    );

    workspaceStateMap.set(workspaceId, {
      entityList: [...selectedEntities],
      relationshipList: [...selectedRelationships]
    });
  }
  return workspaceStateMap.get(workspaceId)!;
}

/**
 * Find relationships from global pool that connect the given node
 * to nodes already in the workspace.
 */
function findConnectingRelationships(nodeId: string, existingNodeIds: Set<string>): RelationshipResponse[] {
  const { relationships } = getMockData();
  return relationships.filter(
    r =>
      (r.sourceEntityId === nodeId && existingNodeIds.has(r.relatedEntityId)) ||
      (r.relatedEntityId === nodeId && existingNodeIds.has(r.sourceEntityId))
  );
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get workspace by ID.
 */
export async function getWorkspaceById(id: string): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(id);
  return {
    id,
    name: `Workspace ${id}`,
    entityList: state.entityList,
    relationshipList: state.relationshipList
  };
}

/**
 * Add nodes to workspace by IDs.
 * Automatically adds relationships that connect new nodes to existing nodes.
 */
export async function addNodesToWorkspace(workspaceId: string, nodeIds: string[]): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(workspaceId);
  const { entities } = getMockData();

  const existingNodeIds = new Set(state.entityList.map(e => e.id));
  const existingRelationshipIds = new Set(state.relationshipList.map(r => r.relationshipId));

  for (const nodeId of nodeIds) {
    if (existingNodeIds.has(nodeId)) continue;

    const entity = entities.find(e => e.id === nodeId);
    if (!entity) continue;

    state.entityList.push(entity);
    existingNodeIds.add(nodeId);

    const connectingRelationships = findConnectingRelationships(nodeId, existingNodeIds);
    for (const rel of connectingRelationships) {
      if (!existingRelationshipIds.has(rel.relationshipId)) {
        state.relationshipList.push(rel);
        existingRelationshipIds.add(rel.relationshipId);
      }
    }
  }

  return getWorkspaceById(workspaceId);
}

/**
 * Remove nodes from workspace by IDs.
 * Automatically removes relationships where either endpoint is removed.
 */
export async function removeNodesFromWorkspace(workspaceId: string, nodeIds: string[]): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(workspaceId);
  const nodeIdsToRemove = new Set(nodeIds);

  state.entityList = state.entityList.filter(e => !nodeIdsToRemove.has(e.id));
  state.relationshipList = state.relationshipList.filter(
    r => !nodeIdsToRemove.has(r.sourceEntityId) && !nodeIdsToRemove.has(r.relatedEntityId)
  );

  return getWorkspaceById(workspaceId);
}
```

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/workspace/server/services/workspace.mock-service.ts
git commit -m "feat(workspace): add mock service with per-workspace state"
```

---

## Task 3: Create Workspace Service

**Files:**
- Create: `src/features/workspace/server/services/workspace.service.ts`

**Step 1: Create the service**

```typescript
// src/features/workspace/server/services/workspace.service.ts
import 'server-only';

import { toEntity } from '@/models/entity.model';
import type { Workspace } from '@/models/workspace.model';
import * as mockService from './workspace.mock-service';

function toWorkspace(response: Awaited<ReturnType<typeof mockService.getWorkspaceById>>): Workspace {
  return {
    id: response.id,
    name: response.name,
    entityList: response.entityList.map(toEntity),
    relationshipList: response.relationshipList,
    viewPreference: {
      scale: 1,
      coordinate: {}
    }
  };
}

/**
 * Get workspace by ID.
 */
export async function getWorkspaceById(id: string): Promise<Workspace> {
  const response = await mockService.getWorkspaceById(id);
  return toWorkspace(response);
}

/**
 * Add nodes to workspace.
 */
export async function addNodesToWorkspace(workspaceId: string, nodeIds: string[]): Promise<Workspace> {
  const response = await mockService.addNodesToWorkspace(workspaceId, nodeIds);
  return toWorkspace(response);
}

/**
 * Remove nodes from workspace.
 */
export async function removeNodesFromWorkspace(workspaceId: string, nodeIds: string[]): Promise<Workspace> {
  const response = await mockService.removeNodesFromWorkspace(workspaceId, nodeIds);
  return toWorkspace(response);
}
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/workspace/server/services/workspace.service.ts
git commit -m "feat(workspace): add workspace service layer"
```

---

## Task 4: Create Workspace Router

**Files:**
- Create: `src/features/workspace/server/routers.ts`
- Modify: `src/lib/orpc/router.ts`

**Step 1: Create the router**

```typescript
// src/features/workspace/server/routers.ts
import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { workspaceSchema } from '@/models/workspace.model';
import * as workspaceService from './services/workspace.service';

const API_WORKSPACE_PREFIX = '/workspaces';
const tags = ['Workspace'];

export const workspaceRouter = appProcedure.router({
  getById: appProcedure
    .route({
      method: 'GET',
      path: `${API_WORKSPACE_PREFIX}/:id`,
      summary: 'Get workspace by ID',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(workspaceSchema)
    .handler(async ({ input }) => {
      return workspaceService.getWorkspaceById(input.id);
    }),

  addNodes: appProcedure
    .route({
      method: 'POST',
      path: `${API_WORKSPACE_PREFIX}/:workspaceId/nodes`,
      summary: 'Add nodes to workspace',
      tags
    })
    .input(z.object({ workspaceId: z.string(), nodeIds: z.array(z.string()) }))
    .output(workspaceSchema)
    .handler(async ({ input }) => {
      return workspaceService.addNodesToWorkspace(input.workspaceId, input.nodeIds);
    }),

  removeNodes: appProcedure
    .route({
      method: 'DELETE',
      path: `${API_WORKSPACE_PREFIX}/:workspaceId/nodes`,
      summary: 'Remove nodes from workspace',
      tags
    })
    .input(z.object({ workspaceId: z.string(), nodeIds: z.array(z.string()) }))
    .output(workspaceSchema)
    .handler(async ({ input }) => {
      return workspaceService.removeNodesFromWorkspace(input.workspaceId, input.nodeIds);
    })
});
```

**Step 2: Register router in main router**

Modify `src/lib/orpc/router.ts`:

```typescript
// Add import at top
import { workspaceRouter } from '@/features/workspace/server/routers';

// Add to router object
export const router = {
  appConfig: appConfigRouter,
  appSettings: appSettingsRouter,
  entity: entityRouter,
  files: filesRouter,
  project: projectRouter,
  todo: todoRouter,
  workspace: workspaceRouter  // Add this line
};
```

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/workspace/server/routers.ts src/lib/orpc/router.ts
git commit -m "feat(workspace): add ORPC router for workspace API"
```

---

## Task 5: Add Workspace Zod Schema

**Files:**
- Modify: `src/models/workspace.model.ts`

**Step 1: Check current workspace model**

The workspace model needs a Zod schema for ORPC output validation.

**Step 2: Update workspace model to add schema**

```typescript
// src/models/workspace.model.ts
import { z } from 'zod';
import { entitySchema, type Entity } from './entity.model';
import { relationshipSchema, type Relationship } from './relationship.model';
import { viewPreferenceSchema, type ViewPreference } from './view-preference.model';

/**
 * Workspace containing entities, relationships, and view preferences.
 */
export interface Workspace {
  id: string;
  name: string;
  entityList: Entity[];
  viewPreference: ViewPreference;
  relationshipList: Relationship[];
}

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  entityList: entitySchema.array(),
  viewPreference: viewPreferenceSchema,
  relationshipList: relationshipSchema.array()
});
```

**Step 3: Verify relationship and view-preference models have schemas**

Check `src/models/relationship.model.ts` - add schema if missing:

```typescript
// src/models/relationship.model.ts
import { z } from 'zod';

export interface Relationship {
  relationshipId: string;
  predicate: string;
  sourceEntityId: string;
  relatedEntityId: string;
}

export const relationshipSchema = z.object({
  relationshipId: z.string(),
  predicate: z.string(),
  sourceEntityId: z.string(),
  relatedEntityId: z.string()
});
```

Check `src/models/view-preference.model.ts` - add schema if missing:

```typescript
// src/models/view-preference.model.ts
import { z } from 'zod';
import { coordinateSchema, type Coordinate } from './cooordinate.model';

export interface ViewPreference {
  scale: number;
  coordinate: Coordinate;
}

export const viewPreferenceSchema = z.object({
  scale: z.number(),
  coordinate: coordinateSchema
});
```

Check `src/models/cooordinate.model.ts` - add schema if missing:

```typescript
// src/models/cooordinate.model.ts
import { z } from 'zod';

export type Coordinate = {
  x?: number;
  y?: number;
};

export const coordinateSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional()
});
```

**Step 4: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 5: Commit**

```bash
git add src/models/workspace.model.ts src/models/relationship.model.ts src/models/view-preference.model.ts src/models/cooordinate.model.ts
git commit -m "feat(models): add Zod schemas for workspace-related models"
```

---

## Task 6: Create Workspace Query Hook

**Files:**
- Create: `src/features/workspace/hooks/useWorkspaceQuery.ts`

**Step 1: Create hooks directory if needed**

Run: `mkdir -p src/features/workspace/hooks`

**Step 2: Create the hook**

```typescript
// src/features/workspace/hooks/useWorkspaceQuery.ts
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useWorkspaceQuery = (workspaceId: string) => {
  return useQuery(orpc.workspace.getById.queryOptions({ input: { id: workspaceId } }));
};
```

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/workspace/hooks/useWorkspaceQuery.ts
git commit -m "feat(workspace): add useWorkspaceQuery hook"
```

---

## Task 7: Update OpenFile Type with Metadata

**Files:**
- Modify: `src/stores/open-files/open-files.store.ts`

**Step 1: Update OpenFile type**

Find the `OpenFile` type definition (around line 44) and update it:

```typescript
/** Open file metadata */
export type OpenFile = {
  id: string;
  name: string;
  metadata?: Record<string, string>;
};
```

**Step 2: Update openFile action signature**

Find the `openFile` action in `OpenFilesActions` interface (around line 73) and update it:

```typescript
openFile: (fileId: string, name: string, metadata?: Record<string, string>, groupId?: GroupId, insertIndex?: number) => void;
```

**Step 3: Update openFile implementation**

Find the `openFile` implementation (around line 220) and update it to accept and store metadata:

```typescript
openFile: (fileId: string, name: string, metadata?: Record<string, string>, groupId?: GroupId, insertIndex?: number) =>
  set(state => {
    // ... existing code to check if file already exists ...

    // Add file at specified index or end of target group
    const newFiles = [...location.group.files];
    const idx = insertIndex ?? newFiles.length;
    newFiles.splice(idx, 0, { id: fileId, name, metadata });  // Add metadata here

    // ... rest of existing code ...
  }),
```

**Step 4: Update initialState to include metadata for ws files**

Find the initial state (around line 184) and update it:

```typescript
const initialState: OpenFilesState['openFiles'] = {
  rows: [
    {
      id: generateId(),
      groups: [
        {
          id: initialGroupId1,
          files: [
            { id: 'ws1', name: 'WS1.ws', metadata: { workspaceId: 'ws1-content' } },
            { id: 'ws2', name: 'WS2.ws', metadata: { workspaceId: 'ws2-content' } },
            { id: 'txt1', name: 'TXT1.txt' }
          ],
          activeFileId: 'ws1'
        },
        {
          id: initialGroupId2,
          files: [
            { id: 'ws3', name: 'WS3.ws', metadata: { workspaceId: 'ws3-content' } },
            { id: 'txt2', name: 'TXT2.txt' }
          ],
          activeFileId: 'ws3'
        }
      ]
    }
  ],
  lastFocusedGroupId: initialGroupId1
};
```

**Step 5: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 6: Commit**

```bash
git add src/stores/open-files/open-files.store.ts
git commit -m "feat(store): add metadata support to OpenFile type"
```

---

## Task 8: Add File Metadata Selector

**Files:**
- Modify: `src/stores/open-files/open-files.selector.ts`

**Step 1: Add useOpenFileMetadata selector**

Add this new selector to the file:

```typescript
/**
 * Get metadata for a specific open file by ID.
 */
export const useOpenFileMetadata = (fileId: string) =>
  useAppStore((state: OpenFilesSlice) => {
    for (const row of state.openFiles.rows) {
      for (const group of row.groups) {
        const file = group.files.find(f => f.id === fileId);
        if (file) return file.metadata;
      }
    }
    return undefined;
  });
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/stores/open-files/open-files.selector.ts
git commit -m "feat(store): add useOpenFileMetadata selector"
```

---

## Task 9: Update File Tree to Pass Metadata

**Files:**
- Modify: `src/features/files/components/file-tree.component.tsx`

**Step 1: Find the openFile call**

Search for `openFile(node.id, node.name)` and update to include metadata:

```typescript
openFile(node.id, node.name, node.metadata);
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/files/components/file-tree.component.tsx
git commit -m "feat(file-tree): pass metadata when opening files"
```

---

## Task 10: Update Editor Tabs for Drag-Drop Metadata

**Files:**
- Modify: `src/features/editor/components/editor-tabs.component.tsx`

**Step 1: Find the drag-drop handler**

Search for where files are opened from drag-drop and update to pass metadata. The drag data should include metadata.

Update the `handleDrop` function to parse and pass metadata:

```typescript
const handleDrop = (e: React.DragEvent) => {
  // ... existing code ...
  const data = JSON.parse(e.dataTransfer.getData(FILE_TREE_MIME_TYPE));
  openFile(data.fileId, data.fileName, data.metadata, groupId, dropIndex);
  // ... rest ...
};
```

Also update the file tree drag start to include metadata in the data transfer.

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/editor/components/editor-tabs.component.tsx
git commit -m "feat(editor-tabs): pass metadata in drag-drop handler"
```

---

## Task 11: Update Workspace Graph Types

**Files:**
- Modify: `src/features/workspace/types.ts`

**Step 1: Update types to extend Entity**

```typescript
// src/features/workspace/types.ts
/**
 * Workspace Graph Types
 *
 * Type definitions for the D3 force-directed graph.
 */

import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import type { Entity } from '@/models/entity.model';

/**
 * Workspace graph node - extends Entity with D3 simulation properties.
 */
export interface WorkspaceGraphNode extends Entity, SimulationNodeDatum {
  fx?: number | null;
  fy?: number | null;
}

/**
 * Workspace graph link connecting two nodes.
 */
export interface WorkspaceGraphLink extends SimulationLinkDatum<WorkspaceGraphNode> {
  source: string | WorkspaceGraphNode;
  target: string | WorkspaceGraphNode;
  predicate: string;
}

/**
 * Complete workspace graph data structure.
 */
export interface WorkspaceGraphData {
  nodes: WorkspaceGraphNode[];
  links: WorkspaceGraphLink[];
}
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/workspace/types.ts
git commit -m "refactor(workspace): update graph types to extend Entity"
```

---

## Task 12: Clean Up Constants File

**Files:**
- Modify: `src/features/workspace/const.ts`

**Step 1: Remove unused functions**

Remove `generateSampleData`, `getNodeColor`, `hashString`, `NODE_COLORS`, and `SAMPLE_NAMES`. Keep only `GRAPH_CONFIG`:

```typescript
// src/features/workspace/const.ts
/**
 * Workspace Graph Constants
 *
 * Configuration for the D3 graph.
 */

/**
 * Graph layout and physics configuration.
 */
export const GRAPH_CONFIG = {
  /** Node circle radius in pixels */
  nodeRadius: 20,
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
  fitPadding: 50
} as const;
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/workspace/const.ts
git commit -m "refactor(workspace): remove unused sample data generation"
```

---

## Task 13: Create WorkspaceComponent Wrapper

**Files:**
- Create: `src/features/workspace/components/workspace.component.tsx`

**Step 1: Create the component**

```typescript
// src/features/workspace/components/workspace.component.tsx
'use client';

import { useOpenFileMetadata } from '@/stores/open-files/open-files.selector';
import { useWorkspaceQuery } from '@/features/workspace/hooks/useWorkspaceQuery';
import WorkspaceGraphComponent from './workspace-graph.component';

interface WorkspaceComponentProps {
  fileId: string;
}

const WorkspaceComponent = ({ fileId }: WorkspaceComponentProps) => {
  // Get file metadata from Zustand store
  const metadata = useOpenFileMetadata(fileId);
  const workspaceId = metadata?.workspaceId ?? fileId;

  // Fetch workspace data
  const { data: workspace, isPending, isError } = useWorkspaceQuery(workspaceId);

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-muted-foreground">Loading workspace...</span>
      </div>
    );
  }

  if (isError || !workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-destructive">Failed to load workspace</span>
      </div>
    );
  }

  return <WorkspaceGraphComponent workspace={workspace} />;
};

export default WorkspaceComponent;
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/workspace/components/workspace.component.tsx
git commit -m "feat(workspace): add WorkspaceComponent data fetching wrapper"
```

---

## Task 14: Update WorkspaceGraphComponent

**Files:**
- Modify: `src/features/workspace/components/workspace-graph.component.tsx`

**Step 1: Update imports**

```typescript
import { GRAPH_CONFIG } from '../const';
import type { WorkspaceGraphNode, WorkspaceGraphLink, WorkspaceGraphData } from '../types';
import type { Workspace } from '@/models/workspace.model';
```

Remove import of `generateSampleData` and `getNodeColor`.

**Step 2: Update Props interface**

```typescript
interface WorkspaceGraphComponentProps {
  workspace: Workspace;
}

const WorkspaceGraphComponent = ({ workspace }: WorkspaceGraphComponentProps) => {
```

**Step 3: Update data conversion**

Replace the `useMemo` for data:

```typescript
// Convert workspace data to graph format
const data = useMemo<WorkspaceGraphData>(
  () => ({
    nodes: workspace.entityList as WorkspaceGraphNode[],
    links: workspace.relationshipList.map(rel => ({
      source: rel.sourceEntityId,
      target: rel.relatedEntityId,
      predicate: rel.predicate
    }))
  }),
  [workspace.entityList, workspace.relationshipList]
);
```

**Step 4: Update node rendering to use labelNormalized**

Change all `d.name` to `d.labelNormalized`:
- Node label text: `d.name` -> `d.labelNormalized`
- Node fill color: Use a constant color instead of `getNodeColor(d.name)`, e.g., `'hsl(210, 70%, 50%)'`

**Step 5: Update context menu toast messages**

Change `contextMenuNode?.name` to `contextMenuNode?.labelNormalized` in all toast messages.

**Step 6: Update type references**

Change all `GraphNode` to `WorkspaceGraphNode`, `GraphLink` to `WorkspaceGraphLink`, `GraphData` to `WorkspaceGraphData`.

**Step 7: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 8: Commit**

```bash
git add src/features/workspace/components/workspace-graph.component.tsx
git commit -m "refactor(workspace): update graph component to use Workspace prop"
```

---

## Task 15: Update Editor Content Routing

**Files:**
- Modify: `src/features/editor/components/editor-content.component.tsx`

**Step 1: Update import**

```typescript
import WorkspaceComponent from '@/features/workspace/components/workspace.component';
```

Remove import of `WorkspaceGraphComponent`.

**Step 2: Update the switch case**

```typescript
case 'ws':
  return <WorkspaceComponent fileId={fileId} />;
```

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/editor/components/editor-content.component.tsx
git commit -m "feat(editor): route .ws files through WorkspaceComponent"
```

---

## Task 16: Test the Integration

**Step 1: Start the dev server**

Run: `npm run dev`
Expected: Server starts without errors

**Step 2: Test opening a .ws file**

1. Open browser to localhost:3000
2. Open a .ws file from the file tree
3. Verify graph displays with real entity data

**Step 3: Run the build**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: verify workspace graph entity integration"
```

---

## Summary

This implementation plan covers:

1. **Models** - WorkspaceResponse model with Zod schemas
2. **Mock Service** - Stateful per-workspace data with add/remove support
3. **Service Layer** - Converts API response to internal Workspace model
4. **ORPC Router** - Three endpoints: getById, addNodes, removeNodes
5. **Hooks** - useWorkspaceQuery for data fetching
6. **Store Updates** - OpenFile type with metadata, selector for file metadata
7. **Component Updates** - WorkspaceComponent wrapper, pure WorkspaceGraphComponent
8. **File Tree/Editor** - Pass metadata through the chain

Total: 16 tasks with incremental commits at each step.
