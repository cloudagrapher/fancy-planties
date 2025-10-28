import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fancy_planties';

// Connection configuration with pooling
const client = postgres(connectionString, {
  prepare: false,
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
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

// Set user context for RLS (Row Level Security)
export async function setUserContext(userId: number) {
  try {
    await db.execute(sql`SELECT set_current_user_id(${userId})`);
  } catch (error) {
    console.error('Failed to set user context:', error);
    throw new Error('Failed to set user context');
  }
}

// Clear user context
export async function clearUserContext() {
  try {
    await db.execute(sql`SELECT set_config('app.current_user_id', '', true)`);
  } catch (error) {
    console.error('Failed to clear user context:', error);
  }
}

// Database transaction wrapper with error handling
export async function withTransaction<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (tx: any) => Promise<T>
): Promise<T> {
  try {
    return await db.transaction(callback);
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
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

// Export all schema and utilities
export * from './schema';
export { eq, and, desc, asc, sql };
export { MigrationUtils } from './migrations';