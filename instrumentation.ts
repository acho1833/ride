// instrumentation.ts (in your project root, same level as app/)
import mongoose from 'mongoose';
import dbConnect, { toJSONPlugin } from '@/lib/db';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Apply plugin once on server startup
    mongoose.plugin(toJSONPlugin);
    try {
      await dbConnect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      console.error('Shutting down server...');
      process.exit(1); // Force shutdown with error code
    }
  }
}
