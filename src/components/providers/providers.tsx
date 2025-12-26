/**
 * Application Providers
 *
 * Wraps the app with all necessary context providers:
 * - ThemeProvider: Dark/light mode support
 * - QueryClientProvider: TanStack Query for data fetching
 * - ToasterProvider: Toast notifications
 */

'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';
import { createQueryClient } from '@/lib/query/client';
import { ThemeProvider } from 'next-themes';
import ToasterProvider from '@/components/providers/toaster.provider';

/**
 * Root provider component that wraps the entire application
 * @param children - App content to wrap with providers
 */
export default function Providers({ children }: { children: ReactNode }) {
  // Create query client once and persist across renders
  const [queryClient] = useState(() => createQueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* DevTools for debugging queries (bottom-right corner) */}
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      </QueryClientProvider>
      {/* Toast notification container */}
      <ToasterProvider />
    </ThemeProvider>
  );
}
