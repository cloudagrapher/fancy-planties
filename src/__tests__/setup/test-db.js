import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';

// Use test database connection with environment variable fallback
const connectionString = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fancy_planties';
let testDb;

try {
  const client = postgres(connectionString);
  testDb = drizzle(client, { schema });
} catch (error) {
  throw new Error(`Failed to connect to test database: ${error.message}`);
}

export { testDb };