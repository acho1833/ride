# File Tree Persistence Design

## Overview

Persist user file tree structures to MongoDB, replacing the current in-memory mock data. Each user has their own independent file tree. Files contain metadata (e.g., `workspaceId`, `textId`) that references content in other collections.

## Data Model

**Collection:** `user-file-tree`

```typescript
// src/models/user-file-tree.model.ts
interface FileNode {
  id: string;
  name: string;
  type: 'file';
  metadata: Record<string, unknown>;  // e.g., { workspaceId: "abc" } or { textId: "xyz" }
}

interface FolderNode {
  id: string;
  name: string;
  type: 'folder';
  children: TreeNode[];
}

type TreeNode = FileNode | FolderNode;

interface UserFileTree {
  id: string;
  userId: string;        // User's sid from certificate
  structure: FolderNode; // Root folder with nested tree
}
```

- One document per user (`userId` is unique index)
- `structure` is the complete nested tree
- Root folder exists in data but UI renders only its children
- New users get initialized with default mock data on first `GET /files`

## API Endpoints

**Feature location:** `src/features/files/server/`

| Method | Path | Purpose | Input | Output |
|--------|------|---------|-------|--------|
| GET | `/files` | Get user's file tree | - | `FolderNode` |
| POST | `/files` | Add file or folder | `{ parentId, node }` | `FolderNode` |
| DELETE | `/files/:id` | Delete file or folder | - | `FolderNode` |
| PUT | `/files/:id` | Rename node | `{ name }` | `FolderNode` |
| PUT | `/files/:id/move` | Move node | `{ newParentId }` | `FolderNode` |

**Behaviors:**
- All endpoints identify user via `appConfig.user.sid` from request context
- `GET /files` creates default tree if user has none
- All mutations return the full updated tree
- CRUD logic lives only on the server

## Loading Flow

**Combined AppLoaderProvider** replaces `AppConfigProvider`:

1. Fires `GET /app-config` and `GET /files` in parallel on mount
2. Waits for both to complete
3. Updates both stores (`appConfig` and `files`)
4. Cleans up `openFolderIds` - removes IDs for folders that no longer exist
5. Shows loading spinner until both are loaded

```
QueryClientProvider
  └── AppLoaderProvider (loads appConfig + files in parallel)
        └── {children}
```

## OpenFolderIds Cleanup

`openFolderIds` lives in `files.store.ts` (persisted via sessionStorage). On load, after receiving tree from server, filter out invalid IDs:

```typescript
// In AppLoaderProvider, after fetching tree:
const validFolderIds = getAllFolderIds(structure);
const cleanedOpenIds = openFolderIds.filter(id => validFolderIds.includes(id));
setOpenFolderIds(cleanedOpenIds);
```

This handles folders deleted on another device or session.

## Store Changes

**Simplify `files.store.ts`:**

Remove CRUD logic (server handles it). Keep:
- `structure: FolderNode` - the tree
- `selectedId: string | null` - selected node
- `openFolderIds: string[]` - expanded folders (sessionStorage)
- `pendingNodeId: string | null` - node being mutated (NEW)
- `isLoaded: boolean` - loading state (NEW)

Actions:
- `setFileStructure(structure)` - replace entire tree, set `isLoaded: true`
- `setPendingNodeId(id | null)` - set/clear loading node
- `setOpenFolderIds(ids)` - for cleanup after load
- `toggleFolder`, `expandAllFolders`, `collapseAllFolders`, `revealFile` - keep as-is

Remove:
- `addNode` - server handles
- `deleteNode` - server handles
- `renameNode` - server handles

## Mutation Flow

```typescript
const handleDelete = (nodeId) => {
  setPendingNodeId(nodeId);      // Dim the node in UI
  deleteFile({ id: nodeId }, {
    onSuccess: (newTree) => {
      setFileStructure(newTree);
      setPendingNodeId(null);
    },
    onError: () => {
      setPendingNodeId(null);
      toast.error('Failed to delete');
    }
  });
};
```

## UI Loading State

- Node being mutated (`pendingNodeId`) shows dimmed/loading state
- Root folder is hidden - UI renders `structure.children`

## Dev Tooling

**Reset script:** `npm run db:reset-files`

- Resets current user's file tree to default mock data
- Default data stored in `src/features/files/server/default-file-tree.json`
- Useful for development and testing

## File Structure

```
src/features/files/
├── server/
│   ├── routers.ts                    # ORPC endpoints
│   ├── services/
│   │   └── file-tree.service.ts      # CRUD + tree manipulation
│   └── default-file-tree.json        # Default mock data
├── hooks/
│   ├── useFilesQuery.ts              # GET /files
│   ├── useFileCreateMutation.ts      # POST /files
│   ├── useFileDeleteMutation.ts      # DELETE /files/:id
│   ├── useFileRenameMutation.ts      # PUT /files/:id
│   └── useFileMoveMutation.ts        # PUT /files/:id/move
├── components/
│   └── (existing components)
└── views/
    └── (existing views)

src/models/
└── user-file-tree.model.ts           # Zod schemas + types

src/collections/
└── user-file-tree.collection.ts      # Mongoose model

src/stores/files/
├── files.store.ts                    # Simplified store
└── files.selector.ts                 # Updated selectors

src/components/providers/
├── app-loader-provider.component.tsx # NEW: Combined loader (replaces app-config-provider)
└── providers.tsx                     # Updated to use AppLoaderProvider

scripts/
└── reset-files.ts                    # DB reset script
```
