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
  sid: string;
  structure: FolderNode;
}

// Zod schema for API validation (recursive)
const baseFileNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('file'),
  metadata: z.record(z.string(), z.unknown()).default({})
});

const baseFolderNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('folder')
});

// Recursive tree node schema using z.lazy
export const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.union([baseFileNodeSchema, baseFolderNodeSchema.extend({ children: z.array(treeNodeSchema) })])
);
