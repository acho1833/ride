import 'server-only';

import { ORPCError } from '@orpc/server';
import UserFileTreeCollection from '@/collections/user-file-tree.collection';
import type { FolderNode, TreeNode } from '@/models/user-file-tree.model';

/**
 * Get file tree for a project
 */
export async function getFileTree(sid: string, projectId: string): Promise<FolderNode> {
  const doc = await UserFileTreeCollection.findOne({ sid, projectId });

  if (!doc) {
    throw new ORPCError('NOT_FOUND', { message: 'File tree not found for this project' });
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
    children: tree.children.map(child => (child.type === 'folder' ? addNodeToTree(child, parentId, node) : child))
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
async function saveTree(sid: string, projectId: string, structure: FolderNode): Promise<FolderNode> {
  const doc = await UserFileTreeCollection.findOneAndUpdate({ sid, projectId }, { $set: { structure } }, { new: true });

  if (!doc) {
    throw new ORPCError('BAD_REQUEST', { message: 'File tree not found' });
  }

  return doc.structure;
}

/**
 * Add a new node (file or folder)
 */
export async function addNode(sid: string, projectId: string, parentId: string, name: string, type: 'file' | 'folder'): Promise<TreeNode> {
  const currentTree = await getFileTree(sid, projectId);
  const parent = findNode(currentTree, parentId);

  if (!parent || parent.type !== 'folder') {
    throw new ORPCError('BAD_REQUEST', { message: 'Parent folder not found' });
  }

  // Check for duplicate name in the same folder
  const isDuplicate = parent.children.some(child => child.name === name);
  if (isDuplicate) {
    throw new ORPCError('BAD_REQUEST', { message: `A file with the name '${name}' already exists.` });
  }

  const node: TreeNode =
    type === 'file'
      ? { id: crypto.randomUUID(), name, type: 'file', metadata: {} }
      : { id: crypto.randomUUID(), name, type: 'folder', children: [] };

  const newTree = addNodeToTree(currentTree, parentId, node);
  await saveTree(sid, projectId, newTree);

  return node;
}

/**
 * Delete a node
 */
export async function deleteNode(sid: string, projectId: string, nodeId: string): Promise<FolderNode> {
  const currentTree = await getFileTree(sid, projectId);

  if (currentTree.id === nodeId) {
    throw new ORPCError('BAD_REQUEST', { message: 'Cannot delete root folder' });
  }

  const node = findNode(currentTree, nodeId);
  if (!node) {
    throw new ORPCError('BAD_REQUEST', { message: 'Node not found' });
  }

  const newTree = removeNodeFromTree(currentTree, nodeId);
  return saveTree(sid, projectId, newTree);
}

/**
 * Rename a node
 */
export async function renameNode(sid: string, projectId: string, nodeId: string, newName: string): Promise<FolderNode> {
  const currentTree = await getFileTree(sid, projectId);

  const node = findNode(currentTree, nodeId);
  if (!node) {
    throw new ORPCError('BAD_REQUEST', { message: 'Node not found' });
  }

  const newTree = renameNodeInTree(currentTree, nodeId, newName);
  return saveTree(sid, projectId, newTree);
}

/**
 * Move a node to a new parent
 * @param force - If true, replace existing node with same name in destination
 */
export async function moveNode(sid: string, projectId: string, nodeId: string, newParentId: string, force = false): Promise<FolderNode> {
  const currentTree = await getFileTree(sid, projectId);

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

  // Check for duplicate name in destination folder
  const existingNode = newParent.children.find(child => child.name === node.name && child.id !== nodeId);
  if (existingNode) {
    if (!force) {
      throw new ORPCError('CONFLICT', { message: `A file named '${node.name}' already exists in the destination folder.` });
    }
    // Remove the existing node when force is true
    const treeWithoutExisting = removeNodeFromTree(currentTree, existingNode.id);
    const treeWithoutNode = removeNodeFromTree(treeWithoutExisting, nodeId);
    const newTree = addNodeToTree(treeWithoutNode, newParentId, node);
    return saveTree(sid, projectId, newTree);
  }

  // Remove from current location, add to new parent
  const treeWithoutNode = removeNodeFromTree(currentTree, nodeId);
  const newTree = addNodeToTree(treeWithoutNode, newParentId, node);

  return saveTree(sid, projectId, newTree);
}

/**
 * Reset project's file tree to default (for dev tooling)
 */
export async function resetFileTree(sid: string, projectId: string): Promise<FolderNode> {
  const defaultFileTree = await import('@/features/files/server/default-file-tree.json');

  const doc = await UserFileTreeCollection.findOneAndUpdate(
    { sid, projectId },
    { structure: defaultFileTree.default as FolderNode },
    { new: true }
  );

  if (!doc) {
    throw new ORPCError('NOT_FOUND', { message: 'File tree not found for this project' });
  }

  return doc.structure;
}
