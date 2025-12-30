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
  const doc = await UserFileTreeCollection.findOneAndUpdate({ userId }, { structure }, { new: true });

  if (!doc) {
    throw new ORPCError('BAD_REQUEST', { message: 'User file tree not found' });
  }

  return doc.structure;
}

/**
 * Add a new node (file or folder)
 */
export async function addNode(userId: string, parentId: string, node: TreeNode): Promise<FolderNode> {
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
export async function renameNode(userId: string, nodeId: string, newName: string): Promise<FolderNode> {
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
export async function moveNode(userId: string, nodeId: string, newParentId: string): Promise<FolderNode> {
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
