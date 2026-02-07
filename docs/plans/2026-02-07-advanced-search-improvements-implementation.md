# Advanced Search Improvements - Implementation Plan

## Overview

This document provides step-by-step implementation details for the advanced search improvements described in the design doc.

## Task Checklist

### Task 1: Remove Mock Data from Pattern Results
- [x] 1.1 Remove `MOCK_MATCHES` and `MOCK_RESPONSE` constants from `pattern-results.component.tsx`
- [x] 1.2 Update component to show empty state when `data` is null
- [x] 1.3 Test that real API responses display correctly

### Task 2: Add Pattern Completeness Check
- [x] 2.1 Create `isPatternComplete` utility function in `pattern-search/utils.ts`
- [x] 2.2 Create `getPatternIncompleteReason` utility for messages
- [x] 2.3 Add selector hooks in `pattern-search.selector.ts`

### Task 3: Implement Live Preview
- [x] 3.1 Add debounce constant to `const.ts`
- [x] 3.2 Add debounced auto-search effect in `advanced-search.component.tsx`
- [x] 3.3 Show incomplete reason message when pattern is not ready
- [x] 3.4 Remove manual "Search" button (now automatic)

### Task 4: Add "Show Graph" Button and Modal
- [x] 4.1 Add "Show Graph" button to results header in `pattern-results.component.tsx`
- [x] 4.2 Create `save-workspace-modal.component.tsx` with filename input
- [x] 4.3 Add constants for default filename

### Task 5: Create Workspace from Search Results
- [x] 5.1 Add `createWithData` endpoint to workspace router (accepts entities + relationships directly)
- [x] 5.2 Add `createWorkspaceWithData` service function
- [x] 5.3 Add `setWorkspaceData` to mock service
- [x] 5.4 Create `useWorkspaceCreateWithDataMutation` hook
- [x] 5.5 Create `convertMatchesToWorkspaceData` utility function
- [x] 5.6 Wire up modal to create file, populate workspace, and open tab

---

## Detailed Implementation

### Task 1: Remove Mock Data from Pattern Results

**File:** `src/features/pattern-search/components/pattern-results.component.tsx`

**Changes:**
1. Delete lines 9-147 (MOCK_MATCHES and MOCK_RESPONSE constants)
2. Change line 162 from:
   ```typescript
   const displayData = data ?? MOCK_RESPONSE;
   ```
   to:
   ```typescript
   const displayData = data;
   ```
3. Add early return for null data:
   ```typescript
   if (!displayData) {
     return null;
   }
   ```

---

### Task 2: Add Pattern Completeness Check

**New File:** `src/features/pattern-search/utils.ts`

```typescript
import type { PatternNode, PatternEdge } from './types';

/**
 * Check if all nodes are connected (single graph, no orphans).
 * Uses Union-Find algorithm for efficiency.
 */
export function areAllNodesConnected(nodes: PatternNode[], edges: PatternEdge[]): boolean {
  if (nodes.length === 0) return false;
  if (nodes.length === 1) return true;

  const parent: Record<string, string> = {};

  const find = (id: string): string => {
    if (!parent[id]) parent[id] = id;
    if (parent[id] !== id) parent[id] = find(parent[id]);
    return parent[id];
  };

  const union = (a: string, b: string) => {
    parent[find(a)] = find(b);
  };

  nodes.forEach(n => {
    parent[n.id] = n.id;
  });

  edges.forEach(e => {
    union(e.sourceNodeId, e.targetNodeId);
  });

  const roots = new Set(nodes.map(n => find(n.id)));
  return roots.size === 1;
}

/**
 * Check if at least one node has a filter (type or attribute).
 */
export function hasAtLeastOneFilter(nodes: PatternNode[]): boolean {
  return nodes.some(node => node.type !== null || node.filters.length > 0);
}

/**
 * Check if pattern is complete (ready for preview).
 * Complete means: all nodes connected + at least one filter.
 */
export function isPatternComplete(nodes: PatternNode[], edges: PatternEdge[]): boolean {
  if (nodes.length === 0) return false;
  return areAllNodesConnected(nodes, edges) && hasAtLeastOneFilter(nodes);
}

/**
 * Get reason why pattern is incomplete (for user message).
 * Returns null if pattern is complete.
 */
export function getPatternIncompleteReason(nodes: PatternNode[], edges: PatternEdge[]): string | null {
  if (nodes.length === 0) return null;
  if (!areAllNodesConnected(nodes, edges)) return 'Connect all nodes to see preview';
  if (!hasAtLeastOneFilter(nodes)) return 'Add a filter to see preview';
  return null;
}
```

**File:** `src/stores/pattern-search/pattern-search.selector.ts`

Add new selectors:
```typescript
import { isPatternComplete, getPatternIncompleteReason } from '@/features/pattern-search/utils';

export const useIsPatternComplete = () =>
  useAppStore((state: PatternSearchSlice) =>
    isPatternComplete(state.patternSearch.nodes, state.patternSearch.edges)
  );

export const usePatternIncompleteReason = () =>
  useAppStore((state: PatternSearchSlice) =>
    getPatternIncompleteReason(state.patternSearch.nodes, state.patternSearch.edges)
  );
```

---

### Task 3: Implement Live Preview

**File:** `src/features/pattern-search/const.ts`

Add constant:
```typescript
/** Debounce delay for auto-search when pattern changes */
export const SEARCH_DEBOUNCE_MS = 500;
```

**File:** `src/features/pattern-search/components/advanced-search.component.tsx`

Replace manual search with auto-search:
```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import PatternBuilderComponent from './pattern-builder.component';
import PatternResultsComponent from './pattern-results.component';
import { usePatternSearchMutation } from '../hooks/usePatternSearchMutation';
import { usePatternNodes, usePatternEdges } from '@/stores/pattern-search/pattern-search.selector';
import { useIsPatternComplete, usePatternIncompleteReason } from '@/stores/pattern-search/pattern-search.selector';
import { DEFAULT_PATTERN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../const';
import type { PatternSearchResponse } from '../types';

const AdvancedSearchComponent = () => {
  const [searchResults, setSearchResults] = useState<PatternSearchResponse | null>(null);

  const nodes = usePatternNodes();
  const edges = usePatternEdges();
  const isComplete = useIsPatternComplete();
  const incompleteReason = usePatternIncompleteReason();

  const { mutate: search, isPending } = usePatternSearchMutation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable reference for search to avoid stale closures in timeout
  const searchRef = useRef(search);
  searchRef.current = search;

  // Stable references for nodes/edges to use in timeout callback
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Create stable pattern key for dependency comparison
  const patternKey = JSON.stringify({ nodes, edges });

  // Auto-search when pattern is complete
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!isComplete) {
      setSearchResults(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchRef.current(
        {
          pattern: { nodes: nodesRef.current, edges: edgesRef.current },
          pageSize: DEFAULT_PATTERN_PAGE_SIZE,
          pageNumber: 1
        },
        {
          onSuccess: data => setSearchResults(data)
        }
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [patternKey, isComplete]);

  // Handle pagination
  const handlePageChange = useCallback(
    (page: number) => {
      search(
        {
          pattern: { nodes, edges },
          pageSize: DEFAULT_PATTERN_PAGE_SIZE,
          pageNumber: page
        },
        {
          onSuccess: data => setSearchResults(data)
        }
      );
    },
    [search, nodes, edges]
  );

  return (
    <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
      <ResizablePanel defaultSize={60} minSize={20}>
        <div className="flex h-full flex-col">
          <PatternBuilderComponent />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={40} minSize={15}>
        <div className="flex h-full flex-col pt-2">
          <PatternResultsComponent
            data={searchResults}
            isLoading={isPending}
            onPageChange={handlePageChange}
            incompleteReason={incompleteReason}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default AdvancedSearchComponent;
```

**File:** `src/features/pattern-search/components/pattern-builder.component.tsx`

Remove `onSearch` and `isSearching` props since search is now automatic.

**File:** `src/features/pattern-search/components/pattern-results.component.tsx`

Add `incompleteReason` prop:
```typescript
interface Props {
  data: PatternSearchResponse | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  incompleteReason: string | null;
}

const PatternResultsComponent = ({ data, isLoading, onPageChange, incompleteReason }: Props) => {
  // Show incomplete message
  if (incompleteReason) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">
        {incompleteReason}
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">
        Searching...
      </div>
    );
  }

  // No data yet
  if (!data) {
    return null;
  }

  // ... rest of component (pagination, results list)
};
```

---

### Task 4: Add "Show Graph" Button and Modal

**File:** `src/features/pattern-search/const.ts`

Add constant:
```typescript
/** Default filename for workspace created from search results */
export const DEFAULT_SEARCH_RESULTS_FILENAME = 'search-results';
```

**File:** `src/features/pattern-search/components/pattern-results.component.tsx`

Add button to header:
```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NetworkIcon } from 'lucide-react';
import SaveWorkspaceModalComponent from './save-workspace-modal.component';

const PatternResultsComponent = ({ data, isLoading, onPageChange, incompleteReason }: Props) => {
  const [showSaveModal, setShowSaveModal] = useState(false);

  // ... early returns for incompleteReason, isLoading, !data

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-y-2">
      {/* Header with count and Show Graph button */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-xs">
          Results ({data.totalCount} matches)
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-x-1 text-xs"
          onClick={() => setShowSaveModal(true)}
          disabled={data.matches.length === 0}
        >
          <NetworkIcon className="h-3 w-3" />
          Show Graph
        </Button>
      </div>

      {/* Results list ... */}

      {/* Save Modal */}
      <SaveWorkspaceModalComponent
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        matches={data.matches}
      />
    </div>
  );
};
```

**New File:** `src/features/pattern-search/components/save-workspace-modal.component.tsx`

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { PatternMatch } from '../types';
import { useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { useCurrentProject } from '@/stores/projects/projects.selector';
import { useFileStructure } from '@/stores/files/files.selector';
import { useFileAddMutation } from '@/features/files/hooks/useFileAddMutation';
import { useWorkspaceCreateWithDataMutation } from '@/features/workspace/hooks/useWorkspaceCreateWithDataMutation';
import { convertMatchesToWorkspaceData } from '../utils';
import { DEFAULT_SEARCH_RESULTS_FILENAME } from '../const';

const formSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, dashes and underscores')
});

interface FormValues {
  filename: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: PatternMatch[];
}

const SaveWorkspaceModalComponent = ({ open, onOpenChange, matches }: Props) => {
  const { openNewFile } = useOpenFilesActions();
  const currentProject = useCurrentProject();
  const fileStructure = useFileStructure();
  const { mutateAsync: addFile } = useFileAddMutation();
  const { mutateAsync: createWorkspaceWithData } = useWorkspaceCreateWithDataMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { filename: DEFAULT_SEARCH_RESULTS_FILENAME }
  });

  const onSubmit = async (values: FormValues) => {
    if (!currentProject || !fileStructure) {
      toast.error('No project selected');
      return;
    }

    const filename = `${values.filename}.ws`;

    try {
      // Step 1: Create the .ws file in the file tree (backend generates IDs)
      const newFile = await addFile({
        projectId: currentProject.id,
        parentId: fileStructure.id, // Root folder
        name: filename,
        type: 'file'
      });

      // Step 2: Get the workspaceId from the file metadata
      const workspaceId = (newFile.metadata as Record<string, string>)?.workspaceId;
      if (!workspaceId) {
        toast.error('Failed to create workspace');
        return;
      }

      // Step 3: Populate the workspace with entities and relationships
      const workspaceData = convertMatchesToWorkspaceData(matches);
      await createWorkspaceWithData({
        workspaceId,
        ...workspaceData
      });

      // Step 4: Open the new file in a tab
      openNewFile({
        id: newFile.id,
        name: filename,
        metadata: newFile.metadata as Record<string, string>
      });

      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Errors are handled by the mutation hooks (toast)
      console.error('Failed to create workspace:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Workspace</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="filename"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Filename</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-x-2">
                      <Input {...field} placeholder={DEFAULT_SEARCH_RESULTS_FILENAME} />
                      <span className="text-muted-foreground text-sm">.ws</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SaveWorkspaceModalComponent;
```

---

### Task 5: Create Workspace from Search Results

**File:** `src/features/pattern-search/utils.ts`

Add conversion function:
```typescript
import type { PatternMatch } from './types';
import type { Entity } from '@/models/entity.model';
import type { Relationship } from '@/models/relationship.model';

/**
 * Convert pattern matches to workspace data format.
 * Deduplicates entities and relationships across all matches.
 */
export function convertMatchesToWorkspaceData(matches: PatternMatch[]): {
  entities: Entity[];
  relationships: Relationship[];
} {
  const entityMap = new Map<string, Entity>();
  const relationshipMap = new Map<string, Relationship>();

  for (const match of matches) {
    for (const entity of match.entities) {
      if (!entityMap.has(entity.id)) {
        entityMap.set(entity.id, entity);
      }
    }
    for (const rel of match.relationships) {
      if (!relationshipMap.has(rel.relationshipId)) {
        relationshipMap.set(rel.relationshipId, rel);
      }
    }
  }

  return {
    entities: Array.from(entityMap.values()),
    relationships: Array.from(relationshipMap.values())
  };
}
```

**File:** `src/features/workspace/server/services/workspace.mock-service.ts`

Add new function to set workspace data directly:
```typescript
/**
 * Set workspace data directly (for creating from search results).
 * Replaces any existing data in the workspace.
 */
export async function setWorkspaceData(
  workspaceId: string,
  entities: EntityResponse[],
  relationships: RelationshipResponse[]
): Promise<WorkspaceResponse> {
  workspaceStateMap.set(workspaceId, {
    entityList: entities,
    relationshipList: relationships
  });
  return getWorkspaceById(workspaceId);
}
```

**File:** `src/features/workspace/server/services/workspace.service.ts`

Add service wrapper:
```typescript
/**
 * Create workspace with provided entity and relationship data.
 * Used when creating workspace from search results.
 */
export async function createWorkspaceWithData(
  workspaceId: string,
  entities: Entity[],
  relationships: Relationship[],
  sid: string
): Promise<Workspace> {
  await mockService.setWorkspaceData(workspaceId, entities, relationships);
  return getWorkspaceById(workspaceId, sid);
}
```

**File:** `src/features/workspace/server/routers.ts`

Add new endpoint:
```typescript
import { entitySchema } from '@/models/entity.model';
import { relationshipSchema } from '@/models/relationship.model';

// Add to workspaceRouter:
createWithData: appProcedure
  .route({
    method: 'POST',
    path: `${API_WORKSPACE_PREFIX}/:workspaceId/data`,
    summary: 'Create workspace with entities and relationships',
    tags
  })
  .input(
    z.object({
      workspaceId: z.string(),
      entities: z.array(entitySchema),
      relationships: z.array(relationshipSchema)
    })
  )
  .output(workspaceSchema)
  .handler(async ({ input, context }) => {
    return workspaceService.createWorkspaceWithData(
      input.workspaceId,
      input.entities,
      input.relationships,
      context.sid
    );
  }),
```

**New File:** `src/features/workspace/hooks/useWorkspaceCreateWithDataMutation.ts`

```typescript
import { useMutation } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

export const useWorkspaceCreateWithDataMutation = () => {
  return useMutation(
    orpc.workspace.createWithData.mutationOptions({
      onError: error => {
        toast.error(`Failed to populate workspace: ${error.message}`);
      }
    })
  );
};
```

---

## Files Summary

### New Files
- `src/features/pattern-search/utils.ts` - Utility functions (pattern completeness, data conversion)
- `src/features/pattern-search/components/save-workspace-modal.component.tsx` - Save modal
- `src/features/workspace/hooks/useWorkspaceCreateWithDataMutation.ts` - Create workspace mutation

### Modified Files
- `src/features/pattern-search/components/pattern-results.component.tsx` - Remove mock, add button
- `src/features/pattern-search/components/advanced-search.component.tsx` - Add live preview
- `src/features/pattern-search/components/pattern-builder.component.tsx` - Remove Search button props
- `src/features/pattern-search/const.ts` - Add SEARCH_DEBOUNCE_MS, DEFAULT_SEARCH_RESULTS_FILENAME
- `src/stores/pattern-search/pattern-search.selector.ts` - Add completeness selectors
- `src/features/workspace/server/routers.ts` - Add createWithData endpoint
- `src/features/workspace/server/services/workspace.service.ts` - Add createWorkspaceWithData
- `src/features/workspace/server/services/workspace.mock-service.ts` - Add setWorkspaceData

---

## Testing Checklist

- [ ] Empty canvas shows nothing in results
- [ ] Single node without filter shows "Add a filter to see preview"
- [ ] Single node with type filter shows results
- [ ] Single node with attribute filter shows results
- [ ] Two disconnected nodes shows "Connect all nodes to see preview"
- [ ] Two connected nodes without filters shows "Add a filter to see preview"
- [ ] Two connected nodes with filter on either shows results
- [ ] Results update automatically as filters change (with debounce)
- [ ] "Show Graph" button disabled when no results
- [ ] "Show Graph" opens modal with filename input
- [ ] Filename validation works (only alphanumeric, dash, underscore)
- [ ] Saving creates .ws file in file tree root
- [ ] Saving populates workspace with deduplicated entities/relationships
- [ ] New workspace tab opens after save
- [ ] Force layout runs automatically (no viewState yet)
- [ ] Positions are saved after layout completes
- [ ] Duplicate filename shows error from backend

---

## Implementation Review

### Summary of Changes

All 5 tasks have been completed:

#### Task 1: Remove Mock Data from Pattern Results
- Removed `MOCK_MATCHES` and `MOCK_RESPONSE` constants from `pattern-results.component.tsx`
- Updated component to show empty state when `data` is null
- Added `incompleteReason` prop for displaying pattern status messages

#### Task 2: Add Pattern Completeness Check
- Created `src/features/pattern-search/utils.ts` with:
  - `areAllNodesConnected()` - Uses Union-Find algorithm to check graph connectivity
  - `hasAtLeastOneFilter()` - Checks if any node has type or attribute filter
  - `isPatternComplete()` - Combines both checks
  - `getPatternIncompleteReason()` - Returns user-friendly message
  - `convertMatchesToWorkspaceData()` - Deduplicates matches for workspace creation
- Added `useIsPatternComplete` and `usePatternIncompleteReason` selectors

#### Task 3: Implement Live Preview
- Added `SEARCH_DEBOUNCE_MS = 500` constant
- Refactored `advanced-search.component.tsx` to auto-search when pattern is complete
- Removed manual Search button from `pattern-builder.component.tsx`
- Results now update automatically with debounce as user edits pattern

#### Task 4: Add "Show Graph" Button and Modal
- Added `DEFAULT_SEARCH_RESULTS_FILENAME` constant
- Created `save-workspace-modal.component.tsx` with filename input form
- Added "Show Graph" button to results header (disabled when no matches)

#### Task 5: Create Workspace from Search Results
- Added `setWorkspaceData()` to `workspace.mock-service.ts`
- Added `createWorkspaceWithData()` to `workspace.service.ts`
- Added `createWithData` endpoint to workspace router
- Created `useWorkspaceCreateWithDataMutation` hook

### Files Created
- `src/features/pattern-search/utils.ts`
- `src/features/pattern-search/components/save-workspace-modal.component.tsx`
- `src/features/workspace/hooks/useWorkspaceCreateWithDataMutation.ts`

### Files Modified
- `src/features/pattern-search/components/pattern-results.component.tsx`
- `src/features/pattern-search/components/advanced-search.component.tsx`
- `src/features/pattern-search/components/pattern-builder.component.tsx`
- `src/features/pattern-search/const.ts`
- `src/stores/pattern-search/pattern-search.selector.ts`
- `src/features/workspace/server/routers.ts`
- `src/features/workspace/server/services/workspace.service.ts`
- `src/features/workspace/server/services/workspace.mock-service.ts`

### Build Status
- ✅ Lint passes
- ✅ TypeScript compilation passes
- ✅ Build completes successfully

### Bug Fixes Applied During Implementation

1. **React refs during render error** - Fixed by using `useMemo` for patternKey instead of storing refs during render
2. **setState in effect error** - Fixed by using derived value `displayedResults` instead of calling `setSearchResults(null)`
3. **TypeScript TreeNode.metadata error** - Fixed by adding type guard and explicit `FileNode` type
4. **Filters disappearing when switching nodes** - Fixed by adding `key={selectedNode.id}` to `NodeConfigPanelComponent`
5. **Filters lost on panel close + no live preview while typing** - Fixed by making filters editable and saving immediately to store
6. **Pattern matching with glob-style wildcards** - Fixed by converting glob patterns (`A*`) to proper regex (`^A.*$`). Users can now use:
   - `*` for any characters (e.g., `A*` matches "Alice", "Andrew")
   - `?` for single character (e.g., `Jo?n` matches "John", "Joan")
   - Updated placeholder text to guide users on glob syntax
