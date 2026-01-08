/**
 * Text Editor Constants
 *
 * Configuration for the Lexical rich text editor.
 */

/**
 * Tailwind CSS classes for Lexical editor theme.
 * Applied to different node types for consistent styling.
 */
export const EDITOR_THEME = {
  paragraph: 'mb-2 leading-relaxed',
  heading: {
    h1: 'text-3xl font-bold mb-4 mt-6',
    h2: 'text-2xl font-semibold mb-3 mt-5'
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline'
  }
} as const;

/**
 * Placeholder text shown when editor is empty.
 */
export const PLACEHOLDER_TEXT = 'Start typing...';
