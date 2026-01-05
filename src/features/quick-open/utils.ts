import type { FolderNode } from '@/models/user-file-tree.model';

/** Flat file representation for Quick Open search */
export interface FlatFile {
  id: string;
  name: string;
  path: string;
}

/**
 * Convert a wildcard pattern to a RegExp.
 * Supports '*' as wildcard (matches any characters).
 * Example: "*.ts*" matches "file.tsx", "utils.ts", etc.
 */
export const wildcardToRegex = (pattern: string): RegExp => {
  // Escape special regex characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Convert * to regex .*
  const regexPattern = escaped.replace(/\*/g, '.*');
  return new RegExp(regexPattern, 'i');
};

/**
 * Check if a file matches the search query.
 * Supports wildcard (*) patterns or plain substring matching.
 */
export const matchesSearch = (file: FlatFile, query: string): boolean => {
  if (!query) return true;

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return true;

  // If query contains wildcard, use regex matching
  if (trimmedQuery.includes('*')) {
    const regex = wildcardToRegex(trimmedQuery);
    return regex.test(file.path);
  }

  // Otherwise, simple case-insensitive substring match on path
  return file.path.toLowerCase().includes(trimmedQuery.toLowerCase());
};

/**
 * Extract literal text segments from a wildcard pattern.
 * Example: "*abc*def*" returns ["abc", "def"]
 */
export const extractLiteralSegments = (pattern: string): string[] => {
  return pattern.split('*').filter(segment => segment.length > 0);
};

/**
 * Flatten a file tree into a searchable list of files.
 * Each file includes its full path for searching.
 */
export const flattenFileTree = (node: FolderNode, parentPath = ''): FlatFile[] => {
  const files: FlatFile[] = [];

  for (const child of node.children) {
    const childPath = parentPath ? `${parentPath}/${child.name}` : child.name;

    if (child.type === 'file') {
      files.push({
        id: child.id,
        name: child.name,
        path: childPath
      });
    } else {
      // Recursively flatten folders
      files.push(...flattenFileTree(child as FolderNode, childPath));
    }
  }

  return files;
};
