// Database connection for Node.js scripts (without server-only)
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fancy_planties';

// Connection configuration with pooling
const client = postgres(connectionString, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

export const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
});

// Database connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful database shutdown
export async function closeDatabaseConnection() {
  try {
    await client.end();
    console.log('Database connection closed gracefully');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

export { sql };
export * from './schema';