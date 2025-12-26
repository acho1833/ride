/**
 * JSON Serializer for ORPC
 *
 * Handles serialization/deserialization of data for RPC calls and SSR hydration.
 * Custom serializers can be added for special data types (e.g., Date, Map, Set).
 */

import { StandardRPCJsonSerializer } from '@orpc/client/standard';

/** Configured serializer instance for consistent data transformation */
export const serializer = new StandardRPCJsonSerializer({
  customJsonSerializers: [
    // Add custom serializers here for special types (e.g., Date, Decimal)
  ]
});
