# File Tree Persistence to MongoDB - Changelog

**Feature:** Persist user file tree structure to MongoDB instead of local storage
**Base Commit:** `1f1035fbaa8b08fffcd1b20aa9d18ce709f871ed`
**Date:** 2025-12-30

## Summary

This implementation adds MongoDB persistence for the file tree structure, replacing the previous client-side only storage. Users can now create, rename, delete, and move files/folders with changes persisted to the database.

---

## Commits (oldest to newest)

### 1. `ba2ecf9` - docs: add z.infer guideline and implementation plan
- Added TypeScript & Zod best practices to CLAUDE.md (avoid z.infer)
- Created detailed implementation plan for file tree persistence

### 2. `c7b44fe` - feat: add UserFileTree model and collection
- TypeScript interfaces for FileNode, FolderNode, TreeNode, UserFileTree
- Zod schema for recursive tree validation
- Mongoose collection with userId index

### 3. `27e9cc2` - feat: add default file tree JSON data with metadata
- Contains sample file structure with metadata for each file type
- .ws files have workspaceId, .txt files have textId, etc.

### 4. `abc709f` - feat: add file tree service with CRUD operations
- getFileTree: retrieves user tree, creates default if none exists
- addNode: adds file/folder to parent
- deleteNode: removes node (prevents root deletion)
- renameNode: renames any node
- moveNode: moves node to new parent
- resetFileTree: resets to default (for dev tooling)

### 5. `b207ec8` - refactor: rename userId to sid and add files router
- Rename userId to sid in model, collection, and service for consistency
- Add sid extraction to ORPC context (from DN header or DEV_USER)
- Create files router with CRUD endpoints
- Register files router in main router

### 6. `8bc9ab6` - feat: add file tree query and mutation hooks
- useFileTreeQuery: fetch user's file tree
- useFileAddMutation: add file/folder with toast feedback
- useFileDeleteMutation: delete file/folder with toast feedback
- useFileRenameMutation: rename file/folder with toast feedback
- useFileMoveMutation: move file/folder with toast feedback
- useFileResetMutation: reset file tree to default with toast feedback

### 7. `7cd5d15` - refactor: simplify files store and use server mutations
- Remove CRUD actions from store (now handled by server)
- Add isLoaded flag and setFilesLoaded action
- Update FilesComponent to use mutation hooks for add/delete/rename
- Import TreeNode type from model instead of store
- Clean openFolderIds when structure changes

### 8. `63a30f6` - feat: add file tree loading to AppConfigProvider
- Fetch file tree in parallel with app config
- Block app rendering until both are loaded
- Store file tree structure in Zustand on success

---

## Uncommitted Changes (Bug Fixes & Enhancements)

### Fix: MongoDB nested schema not persisting updates

**Problem:** `addNode` mutation wasn't persisting to MongoDB (`modifiedCount: 0`)

**Root Cause:** Mongoose nested schemas don't properly track deeply nested changes

**Solution:**
1. Changed `user-file-tree.collection.ts` to use `Schema.Types.Mixed` for the structure field
2. Added `$set` operator in `saveTree` function's `findOneAndUpdate` call

### Enhancement: Hide root folder in UI
- Root folder (e.g., "workspaces") no longer displays
- Children are rendered directly at depth 0

### Enhancement: Case-insensitive sorting
- Added `sortChildren()` function
- Folders appear first, then files
- Both sorted alphabetically (case-insensitive)

### Enhancement: Context menu for root level
- Right-click on empty space in file panel shows context menu
- Options: "New File" and "New Folder" (adds to root)

### Fix: Auto-focus input after context menu
- Added `setTimeout(0)` delay in `NewNodeInputComponent`
- Ensures input receives focus after context menu closes

---

## Files Changed

### New Files (10)

| File | Description |
|------|-------------|
| `docs/plans/2025-12-30-file-tree-persistence-implementation.md` | Implementation plan document |
| `src/collections/user-file-tree.collection.ts` | Mongoose collection for user file trees |
| `src/models/user-file-tree.model.ts` | TypeScript interfaces and Zod schemas |
| `src/features/files/server/routers.ts` | ORPC router with file tree endpoints |
| `src/features/files/server/services/file-tree.service.ts` | Business logic for file tree CRUD |
| `src/features/files/server/default-file-tree.json` | Default file tree structure for new users |
| `src/features/files/hooks/useFileTreeQuery.ts` | Query hook for fetching file tree |
| `src/features/files/hooks/useFileAddMutation.ts` | Mutation hook for adding nodes |
| `src/features/files/hooks/useFileDeleteMutation.ts` | Mutation hook for deleting nodes |
| `src/features/files/hooks/useFileRenameMutation.ts` | Mutation hook for renaming nodes |
| `src/features/files/hooks/useFileMoveMutation.ts` | Mutation hook for moving nodes |
| `src/features/files/hooks/useFileResetMutation.ts` | Mutation hook for resetting tree |

### Modified Files (9)

| File | Changes |
|------|---------|
| `CLAUDE.md` | Added z.infer guideline |
| `src/lib/orpc/context.ts` | Added `sid` extraction from headers |
| `src/lib/orpc/router.ts` | Registered files router |
| `src/stores/files/files.store.ts` | Simplified store, removed client-side CRUD, added isLoaded |
| `src/stores/files/files.selector.ts` | Added `useFilesIsLoaded`, `useFileActions` selectors |
| `src/components/providers/app-config-provider.component.tsx` | Added file tree loading in parallel |
| `src/features/files/components/files.component.tsx` | Use mutation hooks, add root context menu |
| `src/features/files/components/file-tree.component.tsx` | Hide root, case-insensitive sorting |
| `src/features/files/components/new-node-input.component.tsx` | Fix auto-focus timing |

---

## File Details

### src/collections/user-file-tree.collection.ts

```typescript
import mongoose, { model, Model, Schema } from 'mongoose';
import type { UserFileTree } from '@/models/user-file-tree.model';

// Use Mixed type for the entire structure to allow deeply nested updates
// Mongoose doesn't track changes in nested schemas well, so Mixed is simpler
const userFileTreeSchema = new Schema<UserFileTree>({
  sid: { type: String, required: true, unique: true, index: true },
  structure: { type: Schema.Types.Mixed, required: true }
});

const UserFileTreeCollection = (mongoose.models.UserFileTree ??
  model<UserFileTree>('UserFileTree', userFileTreeSchema, 'user-file-tree')) as Model<UserFileTree>;

export default UserFileTreeCollection;
```

### src/models/user-file-tree.model.ts

```typescript
import { z } from 'zod';

// TypeScript interfaces
export interface FileNode {
  id: string;
  name: string;
  type: 'file';
  metadata: Record<string, unknown>;
}

export interface FolderNode {
  id: string;
  name: string;
  type: 'folder';
  children: TreeNode[];
}

export type TreeNode = FileNode | FolderNode;

export interface UserFileTree {
  sid: string;
  structure: FolderNode;
}

// Zod schemas for validation
export const fileNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('file'),
  metadata: z.record(z.unknown()).default({})
});

export const folderNodeSchema: z.ZodType<FolderNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal('folder'),
    children: z.array(treeNodeSchema)
  })
);

export const treeNodeSchema: z.ZodType<TreeNode> = z.union([fileNodeSchema, folderNodeSchema]);
```

### src/features/files/server/routers.ts

API endpoints:
- `GET /files` - Get user's file tree
- `POST /files` - Add a file or folder
- `DELETE /files/:nodeId` - Delete a file or folder
- `PATCH /files/:nodeId/rename` - Rename a file or folder
- `PATCH /files/:nodeId/move` - Move a file or folder
- `POST /files/reset` - Reset file tree to default

### src/features/files/server/services/file-tree.service.ts

Service functions:
- `getFileTree(sid)` - Get tree, create default if none exists
- `addNode(sid, parentId, node)` - Add node to parent folder
- `deleteNode(sid, nodeId)` - Delete node (prevents root deletion)
- `renameNode(sid, nodeId, newName)` - Rename node
- `moveNode(sid, nodeId, newParentId)` - Move node to new parent
- `resetFileTree(sid)` - Reset to default tree

Key implementation detail - uses `$set` operator for MongoDB updates:
```typescript
async function saveTree(sid: string, structure: FolderNode): Promise<FolderNode> {
  const doc = await UserFileTreeCollection.findOneAndUpdate(
    { sid },
    { $set: { structure } },
    { new: true }
  );
  // ...
}
```

### src/features/files/components/file-tree.component.tsx

Key changes:
1. Added `sortChildren()` for case-insensitive sorting (folders first)
2. Added early return for root folder that renders children directly
3. Applied sorting to all folder children renders

```typescript
function sortChildren(children: TreeNode[]): TreeNode[] {
  return [...children].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

// For root folder, render children directly without showing the root itself
if (isRoot && node.type === 'folder') {
  return (
    <>
      {editingNode && editingNode.parentId === node.id && (
        <NewNodeInputComponent ... />
      )}
      {node.children && sortChildren(node.children).map(child => (
        <FileTreeComponent key={child.id} node={child} depth={0} />
      ))}
    </>
  );
}
```

### src/features/files/components/files.component.tsx

Key changes:
1. Added context menu wrapper around ScrollArea
2. Context menu has "New File" and "New Folder" options for root

```typescript
return (
  <MainPanelsComponent title="Files" pos={pos} tools={toolbarButtons}>
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <ScrollArea className="flex-1 overflow-y-auto">
          <FileTreeProvider value={fileTreeContextValue}>
            <FileTreeComponent node={fileStructure} isRoot={true} />
          </FileTreeProvider>
        </ScrollArea>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleAddFileToRoot}>New File</ContextMenuItem>
        <ContextMenuItem onClick={() => handleAddFolder(fileStructure.id)}>New Folder</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  </MainPanelsComponent>
);
```

### src/features/files/components/new-node-input.component.tsx

Fix for auto-focus after context menu closes:
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    inputRef.current?.focus();
  }, 0);
  return () => clearTimeout(timer);
}, []);
```

---

## Architecture

```
Client                          Server                         Database
──────                          ──────                         ────────

FilesComponent                  filesRouter                    MongoDB
    │                               │                              │
    ├─ useFileTreeQuery ───────────►│                              │
    │                               ├─ getTree ───────────────────►│
    │                               │◄─────────────────────────────┤
    │◄──────────────────────────────┤                              │
    │                               │                              │
    ├─ useFileAddMutation ─────────►│                              │
    │                               ├─ addNode ───────────────────►│
    │                               │◄─────────────────────────────┤
    │◄──────────────────────────────┤                              │
    │                               │                              │
    └─ (invalidate queries) ────────┘                              │
                                                                   │
Zustand Store                   file-tree.service.ts               │
    │                               │                              │
    ├─ files.structure             ├─ getFileTree()               │
    ├─ files.selectedId            ├─ addNode()                   │
    ├─ files.openFolderIds         ├─ deleteNode()                │
    └─ files.isLoaded              ├─ renameNode()                │
                                   ├─ moveNode()                  │
                                   └─ resetFileTree()             │
```

---

## Testing Notes

All APIs tested via curl:
```bash
# Get tree
curl http://localhost:3000/api/files -H "x-ssl-client-s-dn: CN=testuser"

# Add node
curl -X POST http://localhost:3000/api/files \
  -H "Content-Type: application/json" \
  -H "x-ssl-client-s-dn: CN=testuser" \
  -d '{"parentId":"root-id","node":{"id":"new-id","name":"test.txt","type":"file","metadata":{}}}'

# Rename node
curl -X PATCH http://localhost:3000/api/files/node-id/rename \
  -H "Content-Type: application/json" \
  -H "x-ssl-client-s-dn: CN=testuser" \
  -d '{"nodeId":"node-id","newName":"renamed.txt"}'

# Delete node
curl -X DELETE http://localhost:3000/api/files/node-id \
  -H "Content-Type: application/json" \
  -H "x-ssl-client-s-dn: CN=testuser" \
  -d '{"nodeId":"node-id"}'

# Move node
curl -X PATCH http://localhost:3000/api/files/node-id/move \
  -H "Content-Type: application/json" \
  -H "x-ssl-client-s-dn: CN=testuser" \
  -d '{"nodeId":"node-id","newParentId":"new-parent-id"}'

# Reset tree
curl -X POST http://localhost:3000/api/files/reset \
  -H "x-ssl-client-s-dn: CN=testuser"
```

---

## Stats

```
 20 files changed, 1651 insertions(+), 297 deletions(-)
```

- **New files:** 12
- **Modified files:** 8
- **Lines added:** ~1,651
- **Lines removed:** ~297
