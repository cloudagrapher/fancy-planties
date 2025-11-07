import 'server-only';

import { Lucia } from 'lucia';
import { PostgresJsAdapter } from '@lucia-auth/adapter-postgresql';
import postgres from 'postgres';

// Validate critical configuration on startup
if (process.env.NODE_ENV === 'production') {
  // Ensure DATABASE_URL is set in production
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'CRITICAL SECURITY ERROR: DATABASE_URL environment variable is required in production.\n' +
      'Never use fallback credentials in production!'
    );
  }
}

// Create postgres client for Lucia adapter
// In production, DATABASE_URL must be set (enforced above)
// In development, fall back to localhost for convenience
const connectionString = process.env.DATABASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('DATABASE_URL is required in production'); })()
    : 'postgresql://postgres:postgres@localhost:5432/fancy_planties');

const client = postgres(connectionString);

// Initialize PostgreSQL adapter for Lucia
const adapter = new PostgresJsAdapter(client, {
  session: 'sessions',
  user: 'users',
});

// Determine secure cookie settings
// In production, ALWAYS use secure cookies - no exceptions
const isProduction = process.env.NODE_ENV === 'production';
const useSecureCookies = isProduction;

// Log warning if DISABLE_SECURE_COOKIES is set (it's not supported)
if (process.env.DISABLE_SECURE_COOKIES === 'true') {
  const message = 'WARNING: DISABLE_SECURE_COOKIES environment variable is deprecated and ignored.\n' +
    'Secure cookies are determined by NODE_ENV only.\n' +
    'In production, secure cookies are ALWAYS enforced for security.';

  if (isProduction) {
    // In production, this is a critical error
    throw new Error(
      'CRITICAL SECURITY ERROR: Cannot disable secure cookies in production!\n' +
      'Remove DISABLE_SECURE_COOKIES from your production environment configuration.'
    );
  } else {
    // In development, just warn
    console.warn('⚠️ ', message);
  }
}

// Initialize Lucia with configuration
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    expires: false,
    attributes: {
      // Always secure in production, always insecure in development
      secure: useSecureCookies,
      sameSite: isProduction ? 'strict' : 'lax',
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