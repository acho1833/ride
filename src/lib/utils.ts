/**
 * Utility Functions
 *
 * Common helper functions used throughout the application.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
 * Entity type icon configuration.
 * Maps entity types to Remix Icon CSS class names.
 * This configuration will be externalized to a JSON file in the future.
 */
const ENTITY_ICON_CONFIG: Record<string, string> = {
  Person: 'ri-user-line',
  Organization: 'ri-building-2-line'
};

/** Default icon when entity type is not found in config */
const DEFAULT_ENTITY_ICON = 'ri-question-line';

/**
 * Returns the Remix Icon CSS class name for an entity type.
 * Used for consistent entity type visualization across the app
 * (entity cards, graph nodes, etc.).
 *
 * @param type - Entity type string (e.g., "Person", "Organization")
 * @returns Remix Icon CSS class name
 */
export function getEntityIconClass(type: string): string {
  return ENTITY_ICON_CONFIG[type] ?? DEFAULT_ENTITY_ICON;
}
