/**
 * Query Hydration Utilities
 *
 * Provides SSR hydration support for TanStack Query.
 * Enables server-side data fetching with client-side hydration.
 */

import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import React, { cache, ReactNode } from 'react';
import { createQueryClient } from '@/lib/query/client';

/** Cached query client factory for server components (deduplicated per request) */
export const getQueryClient = cache(createQueryClient);

/**
 * Hydration wrapper for transferring server query state to client
 * @param props
 * children - Components to render with hydrated state
 * client - QueryClient with prefetched data
 */
export function HydrateClient(props: { children: ReactNode; client: QueryClient }) {
  return <HydrationBoundary state={dehydrate(props.client)}>{props.children}</HydrationBoundary>;
}
