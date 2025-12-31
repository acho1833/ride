import type { FolderNode, TreeNode } from '@/models/user-file-tree.model';

/**
 * Find the parent folder of a node by its ID
 */
export function findParentFolder(tree: FolderNode, nodeId: string): FolderNode | null {
  for (const child of tree.children) {
    if (child.id === nodeId) {
      return tree;
    }
    if (child.type === 'folder') {
      const found = findParentFolder(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Check if targetId is a descendant of ancestorId
 */
export function isDescendant(tree: FolderNode, ancestorId: string, targetId: string): boolean {
  // Find the ancestor node
  const ancestor = findNodeById(tree, ancestorId);
  if (!ancestor || ancestor.type !== 'folder') return false;

  // Check if target is within ancestor's subtree
  return isInSubtree(ancestor, targetId);
}

/**
 * Find a node by ID in the tree
 */
export function findNodeById(tree: FolderNode, nodeId: string): TreeNode | null {
  if (tree.id === nodeId) return tree;

  for (const child of tree.children) {
    if (child.id === nodeId) return child;
    if (child.type === 'folder') {
      const found = findNodeById(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Check if nodeId exists within the subtree rooted at folder
 */
function isInSubtree(folder: FolderNode, nodeId: string): boolean {
  for (const child of folder.children) {
    if (child.id === nodeId) return true;
    if (child.type === 'folder' && isInSubtree(child, nodeId)) return true;
  }
  return false;
}

/**
 * Check if a drop target is valid
 * Returns false for: self, descendants, current parent, files
 */
export function isValidDropTarget(
  tree: FolderNode,
  draggedId: string,
  targetId: string
): boolean {
  // Cannot drop on self
  if (draggedId === targetId) return false;

  // Target must be a folder
  const targetNode = findNodeById(tree, targetId);
  if (!targetNode || targetNode.type !== 'folder') return false;

  // Cannot drop on current parent (no-op)
  const currentParent = findParentFolder(tree, draggedId);
  if (currentParent?.id === targetId) return false;

  // Cannot drop folder into its own descendants
  if (isDescendant(tree, draggedId, targetId)) return false;

  return true;
}

/**
 * Check if a folder contains a child with the given name
 */
export function hasChildWithName(tree: FolderNode, folderId: string, name: string): boolean {
  const folder = findNodeById(tree, folderId);
  if (!folder || folder.type !== 'folder') return false;

  return folder.children.some(child => child.name === name);
}
