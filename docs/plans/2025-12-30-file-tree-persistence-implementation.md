# File Tree Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist user file trees to MongoDB, replacing in-memory mock data, with server-side CRUD operations.

**Architecture:** Each user has one document storing their complete file tree. The app loads file tree and app config in parallel on startup. All mutations (add/delete/rename/move) are handled server-side, returning the updated tree. Client shows loading state on affected nodes during mutations.

**Tech Stack:** MongoDB/Mongoose, ORPC, Zustand, TanStack Query, Zod

---

## Task 1: Create Model and Collection

**Files:**
- Create: `src/models/user-file-tree.model.ts`
- Create: `src/collections/user-file-tree.collection.ts`

**Step 1: Create TypeScript interfaces and Zod schema**

```typescript
// src/models/user-file-tree.model.ts
import { z } from 'zod';

// TypeScript interfaces (define explicitly, NOT with z.infer)
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
  id: string;
  userId: string;
  structure: FolderNode;
}

// Zod schema for API validation (recursive)
const baseFileNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('file'),
  metadata: z.record(z.unknown()).default({})
});

const baseFolderNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('folder')
});

// Recursive tree node schema using z.lazy
export const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.union([
    baseFileNodeSchema,
    baseFolderNodeSchema.extend({ children: z.array(treeNodeSchema) })
  ])
);

// Folder schema for API output
export const folderNodeSchema: z.ZodType<FolderNode> = z.lazy(() =>
  baseFolderNodeSchema.extend({ children: z.array(treeNodeSchema) })
);
```

**Step 2: Create Mongoose collection**

```typescript
// src/collections/user-file-tree.collection.ts
import mongoose, { model, Model, Schema } from 'mongoose';
import type { UserFileTree, TreeNode } from '@/models/user-file-tree.model';

// Recursive schema for tree nodes
const treeNodeSchema = new Schema<TreeNode>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['file', 'folder'], required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    children: { type: [this], default: undefined }
  },
  { _id: false }
);

const userFileTreeSchema = new Schema<UserFileTree>({
  userId: { type: String, required: true, unique: true, index: true },
  structure: { type: treeNodeSchema, required: true }
});

const UserFileTreeCollection = (mongoose.models.UserFileTree ??
  model<UserFileTree>('UserFileTree', userFileTreeSchema, 'user-file-tree')) as Model<UserFileTree>;

export default UserFileTreeCollection;
```

**Step 3: Verify it compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/models/user-file-tree.model.ts src/collections/user-file-tree.collection.ts
git commit -m "feat: add UserFileTree model and collection"
```

---

## Task 2: Create Default File Tree JSON

**Files:**
- Create: `src/features/files/server/default-file-tree.json`

**Step 1: Create default file tree data**

Extract the current mock data from `files.store.ts` into a JSON file. Each file has `metadata` with the appropriate ID field based on extension:
- `.ws` files → `{ workspaceId: "<id>" }`
- `.txt` files → `{ textId: "<id>" }`
- `.jsx` files → `{ jsxId: "<id>" }`
- `.js` files → `{ jsId: "<id>" }`

```json
{
  "id": "root",
  "name": "workspaces",
  "type": "folder",
  "children": [
    {
      "id": "uc1",
      "name": "Use Case 1",
      "type": "folder",
      "children": [
        {
          "id": "jd",
          "name": "John Doe",
          "type": "folder",
          "children": [
            { "id": "ws1", "name": "WS1.ws", "type": "file", "metadata": { "workspaceId": "ws1-content" } },
            { "id": "ws2", "name": "WS2.ws", "type": "file", "metadata": { "workspaceId": "ws2-content" } },
            { "id": "txt1", "name": "TXT1.txt", "type": "file", "metadata": { "textId": "txt1-content" } }
          ]
        },
        {
          "id": "janed",
          "name": "Jane Doe",
          "type": "folder",
          "children": [
            { "id": "ws3", "name": "WS3.ws", "type": "file", "metadata": { "workspaceId": "ws3-content" } },
            { "id": "txt2", "name": "TXT2.txt", "type": "file", "metadata": { "textId": "txt2-content" } },
            { "id": "ws4", "name": "WS4.ws", "type": "file", "metadata": { "workspaceId": "ws4-content" } }
          ]
        },
        { "id": "jsx1", "name": "JSX1.jsx", "type": "file", "metadata": { "jsxId": "jsx1-content" } },
        { "id": "js1", "name": "JS1.js", "type": "file", "metadata": { "jsId": "js1-content" } }
      ]
    },
    {
      "id": "uc2",
      "name": "Use Case 2",
      "type": "folder",
      "children": [
        { "id": "ws5", "name": "WS5.ws", "type": "file", "metadata": { "workspaceId": "ws5-content" } },
        { "id": "ws6", "name": "WS6.ws", "type": "file", "metadata": { "workspaceId": "ws6-content" } }
      ]
    },
    { "id": "ws7", "name": "WS7.ws", "type": "file", "metadata": { "workspaceId": "ws7-content" } },
    { "id": "ws8", "name": "WS8.ws", "type": "file", "metadata": { "workspaceId": "ws8-content" } },
    { "id": "txt3", "name": "TXT3.txt", "type": "file", "metadata": { "textId": "txt3-content" } }
  ]
}
```

**Step 2: Commit**

```bash
git add src/features/files/server/default-file-tree.json
git commit -m "feat: add default file tree JSON data with metadata"
```

---

## Task 3: Create File Tree Service

**Files:**
- Create: `src/features/files/server/services/file-tree.service.ts`

**Step 1: Create service with helper functions and CRUD operations**

```typescript
// src/features/files/server/services/file-tree.service.ts
import 'server-only';

import { ORPCError } from '@orpc/server';
import UserFileTreeCollection from '@/collections/user-file-tree.collection';
import type { FolderNode, TreeNode } from '@/models/user-file-tree.model';
import defaultFileTree from '@/features/files/server/default-file-tree.json';

/**
 * Get user's file tree, creating default if none exists
 */
export async function getFileTree(userId: string): Promise<FolderNode> {
  let doc = await UserFileTreeCollection.findOne({ userId });

  if (!doc) {
    doc = await UserFileTreeCollection.create({
      userId,
      structure: defaultFileTree as FolderNode
    });
  }

  return doc.structure;
}

/**
 * Find a node by ID in the tree (recursive)
 */
function findNode(tree: FolderNode, nodeId: string): TreeNode | null {
  if (tree.id === nodeId) return tree;

  for (const child of tree.children) {
    if (child.id === nodeId) return child;
    if (child.type === 'folder') {
      const found = findNode(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Add a node to a parent folder (returns new tree)
 */
function addNodeToTree(tree: FolderNode, parentId: string, node: TreeNode): FolderNode {
  if (tree.id === parentId) {
    return { ...tree, children: [...tree.children, node] };
  }

  return {
    ...tree,
    children: tree.children.map(child =>
      child.type === 'folder' ? addNodeToTree(child, parentId, node) : child
    )
  };
}

/**
 * Remove a node from tree (returns new tree)
 */
function removeNodeFromTree(tree: FolderNode, nodeId: string): FolderNode {
  return {
    ...tree,
    children: tree.children
      .filter(child => child.id !== nodeId)
      .map(child => (child.type === 'folder' ? removeNodeFromTree(child, nodeId) : child))
  };
}

/**
 * Rename a node in tree (returns new tree)
 */
function renameNodeInTree(tree: FolderNode, nodeId: string, newName: string): FolderNode {
  if (tree.id === nodeId) {
    return { ...tree, name: newName };
  }

  return {
    ...tree,
    children: tree.children.map(child => {
      if (child.id === nodeId) {
        return { ...child, name: newName };
      }
      if (child.type === 'folder') {
        return renameNodeInTree(child, nodeId, newName);
      }
      return child;
    })
  };
}

/**
 * Save updated tree to database
 */
async function saveTree(userId: string, structure: FolderNode): Promise<FolderNode> {
  const doc = await UserFileTreeCollection.findOneAndUpdate(
    { userId },
    { structure },
    { new: true }
  );

  if (!doc) {
    throw new ORPCError('BAD_REQUEST', { message: 'User file tree not found' });
  }

  return doc.structure;
}

/**
 * Add a new node (file or folder)
 */
export async function addNode(
  userId: string,
  parentId: string,
  node: TreeNode
): Promise<FolderNode> {
  const currentTree = await getFileTree(userId);
  const parent = findNode(currentTree, parentId);

  if (!parent || parent.type !== 'folder') {
    throw new ORPCError('BAD_REQUEST', { message: 'Parent folder not found' });
  }

  const newTree = addNodeToTree(currentTree, parentId, node);
  return saveTree(userId, newTree);
}

/**
 * Delete a node
 */
export async function deleteNode(userId: string, nodeId: string): Promise<FolderNode> {
  const currentTree = await getFileTree(userId);

  if (currentTree.id === nodeId) {
    throw new ORPCError('BAD_REQUEST', { message: 'Cannot delete root folder' });
  }

  const node = findNode(currentTree, nodeId);
  if (!node) {
    throw new ORPCError('BAD_REQUEST', { message: 'Node not found' });
  }

  const newTree = removeNodeFromTree(currentTree, nodeId);
  return saveTree(userId, newTree);
}

/**
 * Rename a node
 */
export async function renameNode(
  userId: string,
  nodeId: string,
  newName: string
): Promise<FolderNode> {
  const currentTree = await getFileTree(userId);

  const node = findNode(currentTree, nodeId);
  if (!node) {
    throw new ORPCError('BAD_REQUEST', { message: 'Node not found' });
  }

  const newTree = renameNodeInTree(currentTree, nodeId, newName);
  return saveTree(userId, newTree);
}

/**
 * Move a node to a new parent
 */
export async function moveNode(
  userId: string,
  nodeId: string,
  newParentId: string
): Promise<FolderNode> {
  const currentTree = await getFileTree(userId);

  if (currentTree.id === nodeId) {
    throw new ORPCError('BAD_REQUEST', { message: 'Cannot move root folder' });
  }

  const node = findNode(currentTree, nodeId);
  if (!node) {
    throw new ORPCError('BAD_REQUEST', { message: 'Node not found' });
  }

  const newParent = findNode(currentTree, newParentId);
  if (!newParent || newParent.type !== 'folder') {
    throw new ORPCError('BAD_REQUEST', { message: 'New parent folder not found' });
  }

  // Remove from current location, add to new parent
  const treeWithoutNode = removeNodeFromTree(currentTree, nodeId);
  const newTree = addNodeToTree(treeWithoutNode, newParentId, node);

  return saveTree(userId, newTree);
}

/**
 * Reset user's file tree to default (for dev tooling)
 */
export async function resetFileTree(userId: string): Promise<FolderNode> {
  const doc = await UserFileTreeCollection.findOneAndUpdate(
    { userId },
    { structure: defaultFileTree as FolderNode },
    { new: true, upsert: true }
  );

  return doc.structure;
}
```

**Step 2: Verify it compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/features/files/server/services/file-tree.service.ts
git commit -m "feat: add file tree service with CRUD operations"
```

---

## Task 4: Create Files Router

**Files:**
- Create: `src/features/files/server/routers.ts`
- Modify: `src/lib/orpc/router.ts`

**Step 1: Create the router with all endpoints**

```typescript
// src/features/files/server/routers.ts
import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { folderNodeSchema, treeNodeSchema } from '@/models/user-file-tree.model';
import * as fileTreeService from '@/features/files/server/services/file-tree.service';
import * as appConfigService from '@/features/app-config/server/services/app-config.service';

const API_FILES_PREFIX = '/files';
const tags = ['Files'];

export const filesRouter = appProcedure.router({
  get: appProcedure
    .route({
      method: 'GET',
      path: API_FILES_PREFIX,
      summary: 'Get user file tree',
      tags
    })
    .output(folderNodeSchema)
    .handler(async ({ context }) => {
      const { user } = appConfigService.getAppConfig(context.req);
      return fileTreeService.getFileTree(user.sid);
    }),

  create: appProcedure
    .route({
      method: 'POST',
      path: API_FILES_PREFIX,
      summary: 'Add a file or folder',
      tags
    })
    .input(z.object({
      parentId: z.string(),
      node: treeNodeSchema
    }))
    .output(folderNodeSchema)
    .handler(async ({ context, input }) => {
      const { user } = appConfigService.getAppConfig(context.req);
      return fileTreeService.addNode(user.sid, input.parentId, input.node);
    }),

  delete: appProcedure
    .route({
      method: 'DELETE',
      path: `${API_FILES_PREFIX}/:id`,
      summary: 'Delete a file or folder',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(folderNodeSchema)
    .handler(async ({ context, input }) => {
      const { user } = appConfigService.getAppConfig(context.req);
      return fileTreeService.deleteNode(user.sid, input.id);
    }),

  rename: appProcedure
    .route({
      method: 'PUT',
      path: `${API_FILES_PREFIX}/:id`,
      summary: 'Rename a file or folder',
      tags
    })
    .input(z.object({
      id: z.string(),
      name: z.string()
    }))
    .output(folderNodeSchema)
    .handler(async ({ context, input }) => {
      const { user } = appConfigService.getAppConfig(context.req);
      return fileTreeService.renameNode(user.sid, input.id, input.name);
    }),

  move: appProcedure
    .route({
      method: 'PUT',
      path: `${API_FILES_PREFIX}/:id/move`,
      summary: 'Move a file or folder',
      tags
    })
    .input(z.object({
      id: z.string(),
      newParentId: z.string()
    }))
    .output(folderNodeSchema)
    .handler(async ({ context, input }) => {
      const { user } = appConfigService.getAppConfig(context.req);
      return fileTreeService.moveNode(user.sid, input.id, input.newParentId);
    }),

  reset: appProcedure
    .route({
      method: 'POST',
      path: `${API_FILES_PREFIX}/reset`,
      summary: 'Reset file tree to default (dev only)',
      tags
    })
    .output(folderNodeSchema)
    .handler(async ({ context }) => {
      const { user } = appConfigService.getAppConfig(context.req);
      return fileTreeService.resetFileTree(user.sid);
    })
});
```

**Step 2: Register router in main router**

```typescript
// src/lib/orpc/router.ts
import type { RouterClient } from '@orpc/server';
import { appConfigRouter } from '@/features/app-config/server/routers';
import { todoRouter } from '@/features/todos/server/routers';
import { filesRouter } from '@/features/files/server/routers';

export const router = {
  appConfig: appConfigRouter,
  todo: todoRouter,
  files: filesRouter
};

export type AppRouterClient = RouterClient<typeof router>;
```

**Step 3: Verify it compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/features/files/server/routers.ts src/lib/orpc/router.ts
git commit -m "feat: add files router with CRUD endpoints"
```

---

## Task 5: Create Query and Mutation Hooks

**Files:**
- Create: `src/features/files/hooks/useFilesQuery.ts`
- Create: `src/features/files/hooks/useFileCreateMutation.ts`
- Create: `src/features/files/hooks/useFileDeleteMutation.ts`
- Create: `src/features/files/hooks/useFileRenameMutation.ts`
- Create: `src/features/files/hooks/useFileMoveMutation.ts`

**Step 1: Create query hook**

```typescript
// src/features/files/hooks/useFilesQuery.ts
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useFilesQuery = () => {
  return useQuery(orpc.files.get.queryOptions());
};
```

**Step 2: Create mutation hooks**

```typescript
// src/features/files/hooks/useFileCreateMutation.ts
import { useMutation } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

export const useFileCreateMutation = () => {
  return useMutation(
    orpc.files.create.mutationOptions({
      onError: () => {
        toast.error('Failed to create');
      }
    })
  );
};
```

```typescript
// src/features/files/hooks/useFileDeleteMutation.ts
import { useMutation } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

export const useFileDeleteMutation = () => {
  return useMutation(
    orpc.files.delete.mutationOptions({
      onError: () => {
        toast.error('Failed to delete');
      }
    })
  );
};
```

```typescript
// src/features/files/hooks/useFileRenameMutation.ts
import { useMutation } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

export const useFileRenameMutation = () => {
  return useMutation(
    orpc.files.rename.mutationOptions({
      onError: () => {
        toast.error('Failed to rename');
      }
    })
  );
};
```

```typescript
// src/features/files/hooks/useFileMoveMutation.ts
import { useMutation } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

export const useFileMoveMutation = () => {
  return useMutation(
    orpc.files.move.mutationOptions({
      onError: () => {
        toast.error('Failed to move');
      }
    })
  );
};
```

**Step 3: Commit**

```bash
git add src/features/files/hooks/
git commit -m "feat: add files query and mutation hooks"
```

---

## Task 6: Update Files Store

**Files:**
- Modify: `src/stores/files/files.store.ts`
- Modify: `src/stores/files/files.selector.ts`

**Step 1: Simplify store - remove CRUD logic, add isLoaded and pendingNodeId**

Update `files.store.ts`:
- Remove `addNode`, `deleteNode`, `renameNode` actions
- Add `isLoaded: boolean` to state (default `false`)
- Add `pendingNodeId: string | null` to state (default `null`)
- Add `setPendingNodeId` action
- Update `setFileStructure` to also set `isLoaded: true`
- Keep: `toggleFolder`, `expandAllFolders`, `collapseAllFolders`, `revealFile`, `setOpenFolderIds`, `setSelectedFileId`
- Update `FileNode` type to include `metadata: Record<string, unknown>`
- Remove `initialFileStructure` constant - use empty root as placeholder until server loads
- Keep helper functions (`getAllFolderIds`, `findPathToFile`, etc.) as they're used by UI

**Step 2: Update selectors**

Update `files.selector.ts`:
- Add `useFilesIsLoaded` selector
- Add `usePendingNodeId` selector
- Remove `addNode`, `deleteNode`, `renameNode` from `useFileActions`
- Add `setPendingNodeId` to `useFileActions`

**Step 3: Verify it compiles**

Run: `npm run build`
Expected: No TypeScript errors (will have component errors, fix in next task)

**Step 4: Commit**

```bash
git add src/stores/files/
git commit -m "refactor: simplify files store, remove CRUD logic"
```

---

## Task 7: Create AppLoaderProvider

**Files:**
- Create: `src/components/providers/app-loader-provider.component.tsx`
- Modify: `src/components/providers/providers.tsx`
- Delete: `src/components/providers/app-config-provider.component.tsx`

**Step 1: Create combined loader provider**

```typescript
// src/components/providers/app-loader-provider.component.tsx
'use client';

import { useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppConfigQuery } from '@/features/app-config/hooks/useAppConfigQuery';
import { useFilesQuery } from '@/features/files/hooks/useFilesQuery';
import { useAppConfigIsLoaded, useAppConfigActions } from '@/stores/app-config/app-config.selector';
import { useFilesIsLoaded, useFileActions, useOpenFolderIds } from '@/stores/files/files.selector';
import { getAllFolderIds } from '@/stores/files/files.store';

interface AppLoaderProviderProps {
  children: ReactNode;
}

const AppLoaderProviderComponent = ({ children }: AppLoaderProviderProps) => {
  const appConfigIsLoaded = useAppConfigIsLoaded();
  const filesIsLoaded = useFilesIsLoaded();
  const { setAppConfig } = useAppConfigActions();
  const { setFileStructure, setOpenFolderIds } = useFileActions();
  const openFolderIds = useOpenFolderIds();

  // Fire both queries in parallel
  const appConfigQuery = useAppConfigQuery();
  const filesQuery = useFilesQuery();

  // Update app config store when data arrives
  useEffect(() => {
    if (appConfigQuery.isSuccess && appConfigQuery.data) {
      setAppConfig({ user: appConfigQuery.data.user });
    }
  }, [appConfigQuery.isSuccess, appConfigQuery.data, setAppConfig]);

  // Update files store when data arrives, cleanup openFolderIds
  useEffect(() => {
    if (filesQuery.isSuccess && filesQuery.data) {
      setFileStructure(filesQuery.data);

      // Cleanup: filter out folder IDs that no longer exist
      const validFolderIds = getAllFolderIds(filesQuery.data);
      const cleanedOpenIds = openFolderIds.filter(id => validFolderIds.includes(id));

      // If no folders are open, expand all by default
      if (cleanedOpenIds.length === 0) {
        setOpenFolderIds(validFolderIds);
      } else if (cleanedOpenIds.length !== openFolderIds.length) {
        setOpenFolderIds(cleanedOpenIds);
      }
    }
  }, [filesQuery.isSuccess, filesQuery.data, setFileStructure, setOpenFolderIds, openFolderIds]);

  // Show loading until both are loaded
  if (!appConfigIsLoaded || !filesIsLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AppLoaderProviderComponent;
```

**Step 2: Update providers.tsx**

Replace `AppConfigProviderComponent` with `AppLoaderProviderComponent`.

**Step 3: Delete old provider**

Delete `src/components/providers/app-config-provider.component.tsx`.

**Step 4: Verify it compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/components/providers/
git commit -m "feat: create AppLoaderProvider for parallel data loading"
```

---

## Task 8: Update FilesComponent to Use Server CRUD

**Files:**
- Modify: `src/features/files/components/files.component.tsx`

**Step 1: Update to use mutation hooks instead of store actions**

- Import mutation hooks: `useFileCreateMutation`, `useFileDeleteMutation`, `useFileRenameMutation`
- Import `usePendingNodeId` from selectors
- Get `setPendingNodeId` from `useFileActions`
- Update `handleFinishEditing` to call `createMutation.mutate()` and update store on success
- Update `handleDelete` to set pendingNodeId, call `deleteMutation.mutate()`, update store on success
- Update `handleRename` to set pendingNodeId, call `renameMutation.mutate()`, update store on success
- Clear pendingNodeId on success/error

**Step 2: Verify it compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/features/files/components/files.component.tsx
git commit -m "refactor: update FilesComponent to use server CRUD"
```

---

## Task 9: Add Loading State to FileTreeComponent

**Files:**
- Modify: `src/features/files/components/file-tree-context.tsx`
- Modify: `src/features/files/components/file-tree.component.tsx`

**Step 1: Add pendingNodeId to context**

Update `FileTreeContextValue` interface to include `pendingNodeId: string | null`.

**Step 2: Update FileTreeComponent to show loading state**

When `node.id === pendingNodeId`, add opacity and disable interactions:
- Add `opacity-50 pointer-events-none` classes to the node
- Show a small spinner next to the node name

**Step 3: Verify it compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/features/files/components/
git commit -m "feat: add loading state to file tree nodes"
```

---

## Task 10: Add Reset Script

**Files:**
- Create: `scripts/reset-files.ts`
- Modify: `package.json`

**Step 1: Create reset script**

```typescript
// scripts/reset-files.ts
const API_URL = process.env.API_URL || 'http://localhost:3000';
const DEV_USER = process.env.DEV_USER || 'CN=Dev User devuser';

async function resetFiles() {
  console.log('Resetting file tree to default...');

  const response = await fetch(`${API_URL}/api/files/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Pass dev user header if configured
      ...(process.env.CERT_CLIENT_DN_HEADER_NAME && {
        [process.env.CERT_CLIENT_DN_HEADER_NAME]: DEV_USER
      })
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to reset: ${response.status} ${response.statusText}`);
  }

  console.log('File tree reset successfully!');
}

resetFiles().catch(console.error);
```

**Step 2: Add npm script**

Add to `package.json`:
```json
"db:reset-files": "tsx scripts/reset-files.ts"
```

**Step 3: Commit**

```bash
git add scripts/reset-files.ts package.json
git commit -m "feat: add db:reset-files script"
```

---

## Task 11: Test End-to-End

**Step 1: Start dev server and MongoDB**

```bash
docker-compose up -d
npm run dev
```

**Step 2: Test in browser**

1. Open app - should load file tree from server
2. Create a new file - should persist
3. Rename a file - should persist
4. Delete a file - should persist
5. Refresh page - changes should be preserved

**Step 3: Test reset script**

```bash
npm run db:reset-files
```

Refresh browser - file tree should be reset to default.

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete file tree persistence implementation"
```

---

## Summary

This plan implements:
1. MongoDB model and collection for user file trees (TypeScript interfaces + Zod schemas, no z.infer)
2. Default file tree JSON with proper metadata (workspaceId, textId, jsxId, jsId)
3. Server-side CRUD operations with tree manipulation helpers
4. ORPC router with 6 endpoints (get, create, delete, rename, move, reset)
5. Parallel loading of app config and files on startup
6. Simplified Zustand store (server handles CRUD)
7. Loading state on nodes during mutations
8. Dev reset script for testing
