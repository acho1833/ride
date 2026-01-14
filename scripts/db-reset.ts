/**
 * Database Reset Script
 *
 * Drops the entire database to start fresh.
 * Usage: npm run db:reset
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';

// Load .env file manually (no dotenv dependency needed)
const envPath = resolve(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    process.env[key] = value;
  }
});

const MONGODB_USER = process.env.MONGODB_USER;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
const MONGODB_HOST = process.env.MONGODB_HOST;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;
const MONGODB_PORT = process.env.MONGODB_PORT;

const MONGODB_URL = `mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/?authMechanism=DEFAULT`;

async function resetDatabase() {
  console.log(`Connecting to MongoDB...`);
  console.log(`Database: ${MONGODB_DATABASE}`);

  try {
    await mongoose.connect(MONGODB_URL, {
      dbName: MONGODB_DATABASE,
      authSource: 'admin'
    });

    console.log(`Connected. Dropping database "${MONGODB_DATABASE}"...`);

    await mongoose.connection.dropDatabase();

    console.log(`Database "${MONGODB_DATABASE}" dropped successfully.`);
  } catch (error) {
    console.error('Failed to reset database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

resetDatabase();
