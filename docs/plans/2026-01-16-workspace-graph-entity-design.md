# Workspace Graph Entity Integration Design

## Overview

Refactor the workspace graph to use `Entity` model instead of hardcoded sample data. The graph will receive a `Workspace` prop containing entities, relationships, and view preferences.

## Data Flow

```
External API (mocked)     →    Service Layer    →    Component
─────────────────────────────────────────────────────────────
WorkspaceResponse              Workspace             WorkspaceGraphComponent
(no coordinates)               (with coordinates)    (renders D3 graph)
```

## Models

### Already Created

**`src/models/workspace.model.ts`**
```typescript
export interface Workspace {
  id: string;
  name: string;
  entityList: Entity[];
  viewPreference: ViewPreference;
  relationshipList: Relationship[];
}
```

**`src/models/relationship.model.ts`**
```typescript
export interface Relationship {
  relationshipId: string;
  predicate: string;           // Required - relationship type
  sourceEntityId: string;
  relatedEntityId: string;
}
```

**`src/models/view-preference.model.ts`**
```typescript
export interface ViewPreference {
  scale: number;
  coordinate: Coordinate;      // Pan center (optional x/y)
}
```

### To Create

**`src/models/workspace-response.model.ts`** - External API response format
```typescript
export interface WorkspaceResponse {
  id: string;
  name: string;
  entityList: EntityResponse[];
  relationshipList: RelationshipResponse[];
  // No viewPreference - that's stored in our DB
}

export interface RelationshipResponse {
  relationshipId: string;
  predicate: string;
  sourceEntityId: string;
  relatedEntityId: string;
}
```

## File Structure

### New Files to Create

```
src/
├── models/
│   └── workspace-response.model.ts     # External API response types
└── features/
    └── workspace/
        ├── types.ts                    # MODIFY: Rename to WorkspaceGraph* types
        ├── const.ts                    # MODIFY: Remove generateSampleData, update getNodeColor
        ├── server/
        │   ├── routers.ts              # NEW: ORPC routes for workspace
        │   └── services/
        │       ├── workspace.mock-service.ts   # NEW: Mock external API (stateful per-workspace)
        │       └── workspace.service.ts        # NEW: Service layer
        ├── hooks/
        │   ├── useWorkspaceQuery.ts              # NEW: Get workspace
        │   ├── useWorkspaceAddNodesMutation.ts   # NEW: Add nodes to workspace
        │   └── useWorkspaceRemoveNodesMutation.ts # NEW: Remove nodes from workspace
        └── components/
            └── workspace-graph.component.tsx   # MODIFY: Accept Workspace prop
```

## Implementation Details

### 1. Workspace Types (`src/features/workspace/types.ts`)

```typescript
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

### 2. Workspace Mock Service (`src/features/workspace/server/services/workspace.mock-service.ts`)

Generates and caches fake entities + relationships on first call. Maintains per-workspace state in a hashmap to support add/remove operations.

```typescript
import 'server-only';
import { faker } from '@faker-js/faker';
import { EntityResponse } from '@/models/entity-response.model';
import { WorkspaceResponse, RelationshipResponse } from '@/models/workspace-response.model';

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
        label: type === 'Person' ? faker.person.fullName() : faker.company.name(),
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
// Per-workspace state (hashmap of workspace ID → entities + relationships)
// ============================================================================

interface WorkspaceState {
  entityList: EntityResponse[];
  relationshipList: RelationshipResponse[];
}

const workspaceStateMap = new Map<string, WorkspaceState>();

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
function findConnectingRelationships(
  nodeId: string,
  existingNodeIds: Set<string>
): RelationshipResponse[] {
  const { relationships } = getMockData();
  return relationships.filter(r =>
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
export async function addNodesToWorkspace(
  workspaceId: string,
  nodeIds: string[]
): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(workspaceId);
  const { entities } = getMockData();

  const existingNodeIds = new Set(state.entityList.map(e => e.id));
  const existingRelationshipIds = new Set(state.relationshipList.map(r => r.relationshipId));

  for (const nodeId of nodeIds) {
    // Skip if already in workspace
    if (existingNodeIds.has(nodeId)) continue;

    // Find entity in global pool
    const entity = entities.find(e => e.id === nodeId);
    if (!entity) continue;

    // Add entity to workspace
    state.entityList.push(entity);
    existingNodeIds.add(nodeId);

    // Find and add connecting relationships
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
export async function removeNodesFromWorkspace(
  workspaceId: string,
  nodeIds: string[]
): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(workspaceId);
  const nodeIdsToRemove = new Set(nodeIds);

  // Remove entities
  state.entityList = state.entityList.filter(e => !nodeIdsToRemove.has(e.id));

  // Remove relationships where either endpoint is removed
  state.relationshipList = state.relationshipList.filter(
    r => !nodeIdsToRemove.has(r.sourceEntityId) && !nodeIdsToRemove.has(r.relatedEntityId)
  );

  return getWorkspaceById(workspaceId);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
```

### 3. Workspace Service (`src/features/workspace/server/services/workspace.service.ts`)

```typescript
import 'server-only';
import { toEntity } from '@/models/entity.model';
import { Workspace } from '@/models/workspace.model';
import * as mockService from './workspace.mock-service';

function toWorkspace(response: Awaited<ReturnType<typeof mockService.getWorkspaceById>>): Workspace {
  return {
    id: response.id,
    name: response.name,
    entityList: response.entityList.map(toEntity),
    relationshipList: response.relationshipList,
    viewPreference: {
      scale: 1,
      coordinate: {}  // No saved coordinates yet
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

### 4. Component Changes (`workspace-graph.component.tsx`)

**Props change:**
```typescript
// Before
interface Props {
  fileId: string;
  fileName: string;
}

// After
interface WorkspaceGraphComponentProps {
  workspace: Workspace;
}
```

**Data conversion:**
```typescript
// Before
const data = useMemo<GraphData>(() => generateSampleData(), [fileId]);

// After
const graphData: WorkspaceGraphData = useMemo(() => ({
  nodes: workspace.entityList as WorkspaceGraphNode[],
  links: workspace.relationshipList.map(rel => ({
    source: rel.sourceEntityId,
    target: rel.relatedEntityId,
    predicate: rel.predicate
  }))
}), [workspace.entityList, workspace.relationshipList]);
```

**Property renaming (5 locations):**
- `d.name` → `d.labelNormalized` (node color, node label)
- `contextMenuNode?.name` → `contextMenuNode?.labelNormalized` (4 toast messages)

**Type renaming (throughout file):**
- `GraphNode` → `WorkspaceGraphNode`
- `GraphLink` → `WorkspaceGraphLink`
- `GraphData` → `WorkspaceGraphData`

**D3 join with key function (for object constancy when data changes):**
```typescript
// Nodes - key by entity id
.data(nodes, d => d.id)
.join('g')

// Links - key by source+target
.data(links, d => `${d.source}-${d.target}`)
.join('line')
```

### 5. Constants Change (`const.ts`)

```typescript
// REMOVE: generateSampleData() function
// REMOVE: SAMPLE_NAMES constant
// REMOVE: getNodeColor() function
// REMOVE: NODE_COLORS constant
// REMOVE: hashString() function (if only used by getNodeColor)
```

## React/D3 Responsibility Split

**React re-renders when:**
- `workspace` prop changes (entities added/removed, relationships changed)

**D3 handles internally (no React re-render):**
- Node dragging (position updates)
- Zoom/pan
- Simulation ticks
- Hover/selection states

**Object constancy:**
- Key functions in `.join()` preserve node positions when data changes
- Only removed nodes disappear, others stay in place

## Change Summary

| Item | Before | After |
|------|--------|-------|
| Types | `GraphNode`, `GraphLink`, `GraphData` | `WorkspaceGraphNode`, `WorkspaceGraphLink`, `WorkspaceGraphData` |
| Node extends | `SimulationNodeDatum` | `Entity, SimulationNodeDatum` |
| Label property | `name` | `labelNormalized` |
| Link predicate | Not present | `predicate: string` (required) |
| Component props | `{ fileId, fileName }` | `{ workspace: Workspace }` |
| Data source | `generateSampleData()` | `workspace.entityList` + `workspace.relationshipList` |
| Mock data | Generated in const.ts | Stateful per-workspace in `workspace.mock-service.ts` |
| Node operations | Not supported | `addNodesToWorkspace`, `removeNodesFromWorkspace` |

## API Summary

| Method | Description |
|--------|-------------|
| `getWorkspaceById(id)` | Get workspace with entities and relationships |
| `addNodesToWorkspace(workspaceId, nodeIds)` | Add nodes + auto-discover connecting relationships |
| `removeNodesFromWorkspace(workspaceId, nodeIds)` | Remove nodes + associated relationships |

## File Opening Flow

### Current Architecture

Files in the file tree have metadata containing `workspaceId`:

```json
{ "id": "ws7", "name": "WS7.ws", "type": "file", "metadata": { "workspaceId": "ws7-content" } }
```

**Current flow:**
```
File Tree (double-click)
  → openFile(fileId, fileName)
    → OpenFilesStore { id, name }
      → EditorContentComponent receives { fileId, fileName }
        → WorkspaceGraphComponent receives { fileId, fileName }
          → generateSampleData() (ignores fileId)
```

**Problem:** The `workspaceId` from metadata is never passed through.

### Solution: WorkspaceComponent as Data Fetching Wrapper

Create a `WorkspaceComponent` that handles all data fetching, keeping `WorkspaceGraphComponent` as a pure presentational component.

```
EditorContentComponent
  └── WorkspaceComponent (NEW - data fetching layer)
        ├── Gets file metadata from Zustand (by fileId)
        ├── Extracts workspaceId from metadata
        ├── Fetches workspace via useWorkspaceQuery
        ├── Handles loading/error states
        └── WorkspaceGraphComponent (pure rendering)
              └── Receives Workspace prop, renders D3 graph
```

#### 1. Update OpenFile Type (`src/stores/open-files/open-files.store.ts`)

```typescript
// Before
export type OpenFile = {
  id: string;
  name: string;
};

// After
export type OpenFile = {
  id: string;
  name: string;
  metadata?: Record<string, string>;  // Optional metadata from file tree
};
```

#### 2. Update openFile Action Signature

```typescript
// Before
openFile: (fileId: string, name: string, groupId?: GroupId, insertIndex?: number) => void;

// After
openFile: (fileId: string, name: string, metadata?: Record<string, string>, groupId?: GroupId, insertIndex?: number) => void;
```

#### 3. Update File Tree Component (`file-tree.component.tsx`)

```typescript
// Before
openFile(node.id, node.name);

// After
openFile(node.id, node.name, node.metadata);
```

#### 4. Add Selector for File Metadata (`open-files.selector.ts`)

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

#### 5. Create WorkspaceComponent (`src/features/workspace/components/workspace.component.tsx`)

```typescript
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

#### 6. Update Editor Content Component (`editor-content.component.tsx`)

```typescript
// Before
case 'ws':
  return <WorkspaceGraphComponent fileId={fileId} fileName={fileName} />;

// After
case 'ws':
  return <WorkspaceComponent fileId={fileId} />;
```

#### 7. WorkspaceGraphComponent (Pure Presentational)

```typescript
interface WorkspaceGraphComponentProps {
  workspace: Workspace;
}

const WorkspaceGraphComponent = ({ workspace }: WorkspaceGraphComponentProps) => {
  // Pure D3 rendering - no data fetching
  // Receives fully loaded workspace data
  ...
};
```

### Updated Flow

```
File Tree (double-click on WS7.ws)
  → openFile("ws7", "WS7.ws", { workspaceId: "ws7-content" })
    → OpenFilesStore { id: "ws7", name: "WS7.ws", metadata: { workspaceId: "ws7-content" } }
      → EditorContentComponent routes to WorkspaceComponent
        → WorkspaceComponent
            ├── useOpenFileMetadata("ws7") → { workspaceId: "ws7-content" }
            ├── useWorkspaceQuery("ws7-content") → workspace data
            └── WorkspaceGraphComponent receives { workspace }
                  → Renders D3 graph
```

### Files to Modify

| File | Change |
|------|--------|
| `src/stores/open-files/open-files.store.ts` | Add `metadata` to `OpenFile` type and `openFile` action |
| `src/stores/open-files/open-files.selector.ts` | Add `useOpenFileMetadata` selector |
| `src/features/files/components/file-tree.component.tsx` | Pass `node.metadata` when opening files |
| `src/features/editor/components/editor-tabs.component.tsx` | Pass `metadata` in drag-drop handler |
| `src/features/editor/components/editor-content.component.tsx` | Route `.ws` to `WorkspaceComponent` |

### New Files to Create

| File | Purpose |
|------|---------|
| `src/features/workspace/components/workspace.component.tsx` | Data fetching wrapper |
