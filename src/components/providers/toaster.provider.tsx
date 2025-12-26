/**
 * Toaster Provider
 *
 * Toast notification provider that syncs with the app's theme.
 * Uses Sonner for toast notifications.
 */

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

/**
 * Theme-aware toast container
 * Automatically matches light/dark mode
 */
const ToasterProvider = ({ ...props }) => {
  const { theme = 'system' } = useTheme();

  return <Sonner theme={theme as 'light' | 'dark' | 'system'} className="toaster group" {...props} />;
};

export default ToasterProvider;
