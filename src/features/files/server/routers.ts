import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { treeNodeSchema } from '@/models/user-file-tree.model';
import type { FolderNode } from '@/models/user-file-tree.model';
import * as fileTreeService from '@/features/files/server/services/file-tree.service';

const API_FILES_PREFIX = '/files';
const tags = ['Files'];

// Output schema for folder node (root of tree)
const folderNodeOutputSchema: z.ZodType<FolderNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal('folder'),
    children: z.array(treeNodeSchema)
  })
);

export const filesRouter = appProcedure.router({
  getTree: appProcedure
    .route({
      method: 'GET',
      path: API_FILES_PREFIX,
      summary: 'Get user file tree',
      tags
    })
    .output(folderNodeOutputSchema)
    .handler(async ({ context }) => {
      return fileTreeService.getFileTree(context.sid);
    }),

  addNode: appProcedure
    .route({
      method: 'POST',
      path: API_FILES_PREFIX,
      summary: 'Add a file or folder',
      tags
    })
    .input(
      z.object({
        parentId: z.string(),
        name: z.string(),
        type: z.enum(['file', 'folder'])
      })
    )
    .output(treeNodeSchema)
    .handler(async ({ input, context }) => {
      return fileTreeService.addNode(context.sid, input.parentId, input.name, input.type);
    }),

  deleteNode: appProcedure
    .route({
      method: 'DELETE',
      path: `${API_FILES_PREFIX}/:nodeId`,
      summary: 'Delete a file or folder',
      tags
    })
    .input(z.object({ nodeId: z.string() }))
    .output(folderNodeOutputSchema)
    .handler(async ({ input, context }) => {
      return fileTreeService.deleteNode(context.sid, input.nodeId);
    }),

  renameNode: appProcedure
    .route({
      method: 'PATCH',
      path: `${API_FILES_PREFIX}/:nodeId/rename`,
      summary: 'Rename a file or folder',
      tags
    })
    .input(
      z.object({
        nodeId: z.string(),
        newName: z.string()
      })
    )
    .output(folderNodeOutputSchema)
    .handler(async ({ input, context }) => {
      return fileTreeService.renameNode(context.sid, input.nodeId, input.newName);
    }),

  moveNode: appProcedure
    .route({
      method: 'PATCH',
      path: `${API_FILES_PREFIX}/:nodeId/move`,
      summary: 'Move a file or folder to new parent',
      tags
    })
    .input(
      z.object({
        nodeId: z.string(),
        newParentId: z.string()
      })
    )
    .output(folderNodeOutputSchema)
    .handler(async ({ input, context }) => {
      return fileTreeService.moveNode(context.sid, input.nodeId, input.newParentId);
    }),

  reset: appProcedure
    .route({
      method: 'POST',
      path: `${API_FILES_PREFIX}/reset`,
      summary: 'Reset file tree to default (dev only)',
      tags
    })
    .output(folderNodeOutputSchema)
    .handler(async ({ context }) => {
      return fileTreeService.resetFileTree(context.sid);
    })
});
