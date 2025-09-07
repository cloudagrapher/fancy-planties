import 'server-only';

import { Lucia } from 'lucia';
import { PostgresJsAdapter } from '@lucia-auth/adapter-postgresql';
import postgres from 'postgres';

// Create postgres client for Lucia adapter
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fancy_planties';
const client = postgres(connectionString);

// Initialize PostgreSQL adapter for Lucia
const adapter = new PostgresJsAdapter(client, {
  session: 'sessions',
  user: 'users',
});

// Initialize Lucia with configuration
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    expires: false,
    attributes: {
      secure: false, // Allow non-secure cookies for local development
      sameSite: 'lax',
    },
  },
  getUserAttributes: (attributes) => {
    return {
      id: attributes.id,
      email: attributes.email,
      name: attributes.name,
    };
  },
});

// Extend Lucia types
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  id: number;
  email: string;
  name: string;
}