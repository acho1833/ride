/**
 * Utility Functions
 *
 * Common helper functions used throughout the application.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ENTITY_ICON_CONFIG, DEFAULT_ENTITY_ICON } from '@/const';

/**
 * Merges Tailwind CSS classes with proper conflict resolution
 * Combines clsx for conditional classes with tailwind-merge for deduplication
 * @param inputs - Class values to merge (strings, objects, arrays)
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Pauses execution for specified duration
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Returns the Remix Icon CSS class name for an entity type.
 * Used for consistent entity type visualization across the app
 * (entity cards, search results, etc.).
 *
 * @param type - Entity type string (e.g., "Person", "Organization")
 * @returns Remix Icon CSS class name
 */
export function getEntityIconClass(type: string): string {
  return (ENTITY_ICON_CONFIG[type] ?? DEFAULT_ENTITY_ICON).cssClass;
}
