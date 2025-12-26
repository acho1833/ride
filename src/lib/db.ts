/**
 * MongoDB Database Connection Module
 *
 * Provides a singleton database connection using Mongoose.
 * Uses global caching to prevent multiple connections in serverless environments.
 */

import mongoose, { Mongoose, Schema } from 'mongoose';

// Extend global namespace to cache mongoose connection across hot reloads
declare global {
  var mongoose: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  };
}

// Initialize global mongoose cache if not exists
global.mongoose = global.mongoose || {
  conn: null,
  promise: null
};

/** Configuration options for JSON transformation */
interface TransformOptions {
  virtuals?: boolean;
  versionKey?: boolean;
  transform?: (doc: Document, ret: Record<string, any>, options: any) => Record<string, any>;
}

/**
 * Mongoose plugin to normalize JSON output
 * - Converts MongoDB _id to id
 * - Removes version key (__v)
 * - Includes virtual properties
 * @param schema - Mongoose schema to apply the plugin to
 */
export const toJSONPlugin = (schema: Schema) => {
  const toJSONConfig: TransformOptions = {
    virtuals: true,
    versionKey: false,
    transform: (doc: Document, ret: Record<string, any>) => {
      // Convert _id to id for cleaner API responses
      if (ret._id) {
        ret.id = ret._id.toString();
        delete ret._id;
      }

      // Remove internal version key
      delete ret.__v;

      return ret;
    }
  };

  schema.set('toJSON', toJSONConfig as any);
  schema.set('toObject', toJSONConfig as any);
};

// MongoDB connection configuration
const MONGODB_USER_NAME: string = 'root';
const MONGODB_USER_PASSWORD: string = 'password';
const MONGODB_HOST_NAME: string = 'localhost';
const MONGODB_DATABASE: string = 'todo';
const MONGODB_PORT: string = '27017';

// Construct MongoDB connection URL
const MONGODB_URL: string = `mongodb://${MONGODB_USER_NAME}:${MONGODB_USER_PASSWORD}@${MONGODB_HOST_NAME}:${MONGODB_PORT}/?authMechanism=DEFAULT`;

/**
 * Establishes or returns existing MongoDB connection
 * Uses singleton pattern to reuse connections across requests
 * @returns Promise resolving to Mongoose connection instance
 * @throws Error if connection fails
 */
export default async function dbConnect(): Promise<Mongoose> {
  try {
    // Return existing connection if available
    if (global.mongoose.conn) {
      return global.mongoose.conn;
    } else {
      // Create new connection
      const promise: Promise<Mongoose> = mongoose.connect(MONGODB_URL, {
        dbName: MONGODB_DATABASE,
        authSource: 'admin',
        tlsInsecure: true,
        autoIndex: true // Auto-create indexes in development
      });

      // Cache connection globally
      global.mongoose = {
        conn: await promise,
        promise
      };

      return await promise;
    }
  } catch (error: unknown) {
    console.warn('Database is not connected');
    console.error('Error connecting to the database:', error);
    throw new Error('Database connection failed');
  }
}
