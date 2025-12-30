/**
 * Editor Feature Constants
 *
 * Centralized configuration for the editor layout system.
 * These values control split limits and drag-and-drop behavior.
 */

/**
 * Editor layout constraints.
 *
 * @remarks
 * - yGroupLimit controls vertical splits (rows). Set to 2 to allow only top/bottom split.
 * - xGroupLimit controls horizontal splits (groups per row). Set to -1 for unlimited.
 * - These limits are enforced in useCanMoveInDirection selector and moveFileToNewGroup action.
 *
 * @example
 * // Check if user can split down (create new row)
 * if (rows.length >= EDITOR_CONFIG.yGroupLimit) {
 *   // Already at max rows, can only move to existing row
 * }
 */
export const EDITOR_CONFIG: {
  /** Max vertical rows. Use -1 for unlimited. Currently 2 = top/bottom only. */
  yGroupLimit: number;
  /** Max horizontal groups per row. Use -1 for unlimited. */
  xGroupLimit: number;
} = {
  yGroupLimit: 2,
  xGroupLimit: -1
};

/**
 * Cardinal directions for moving files between editor groups.
 * Used by context menu "Move/Split" actions.
 */
export type MoveDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Custom MIME type for file tree drag-and-drop operations.
 *
 * @remarks
 * Using a custom MIME type prevents conflicts with dnd-kit's tab drag system.
 * File tree uses native HTML5 drag/drop while tabs use dnd-kit.
 * The drop handler validates this MIME type before processing.
 */
export const FILE_TREE_MIME_TYPE = 'application/x-file-tree';

/**
 * Minimum distance (pixels) user must drag before drag operation activates.
 *
 * @remarks
 * Prevents accidental drags when clicking tabs. 8px is a common UX threshold
 * that distinguishes intentional drags from sloppy clicks.
 */
export const DRAG_ACTIVATION_DISTANCE = 8;
