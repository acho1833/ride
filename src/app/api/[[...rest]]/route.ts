/**
 * API Route Handler (Catch-All)
 *
 * Handles all API requests using ORPC framework.
 * Supports both RPC-style calls (/api/rpc) and REST-style OpenAPI endpoints (/api/...).
 */

import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
import { onError, ORPCError } from '@orpc/server';
import { NextRequest } from 'next/server';
import { createContext } from '@/lib/orpc/context';
import { RPCHandler } from '@orpc/server/fetch';
import { router } from '@/lib/orpc/router';
import dbConnect from '@/lib/db';
import { API_PREFIX } from '@/const';

/**
 * Error logging handler - only logs server errors (5xx) for ORPC errors
 * @param error - The error to log
 */
const onErrorMessage = (error: unknown) => {
  if (error instanceof ORPCError) {
    // Only log server errors, not client errors (4xx)
    if (error.status >= 500) console.error(error);
  } else {
    console.error(error);
  }
};

/** RPC handler for /api/rpc endpoint - handles typed procedure calls */
const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError(error => {
      onErrorMessage(error);
    })
  ]
});

/** OpenAPI handler for REST-style endpoints with auto-generated documentation */
const apiHandler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        servers: [
          {
            url: API_PREFIX
          }
        ]
      }
    })
  ],
  interceptors: [
    onError(error => {
      onErrorMessage(error);
    })
  ]
});

/**
 * Main request handler for all API routes
 * Tries RPC handler first, then OpenAPI handler, returns 404 if neither matches
 * @param req - Next.js request object
 * @returns API response
 */
async function handleRequest(req: NextRequest) {
  // Ensure database connection before handling request
  await dbConnect();

  // Try RPC handler first (for /api/rpc calls)
  const rpcResult = await rpcHandler.handle(req, {
    prefix: `${API_PREFIX}/rpc`,
    context: await createContext(req)
  });

  if (rpcResult.response) return rpcResult.response;

  // Fall back to OpenAPI handler (for REST-style calls)
  const apiResult = await apiHandler.handle(req, {
    prefix: API_PREFIX,
    context: await createContext(req)
  });
  if (apiResult.response) return apiResult.response;

  // No handler matched
  return new Response('Not found', { status: 404 });
}

// Export handlers for all HTTP methods
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
