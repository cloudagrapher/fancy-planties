import { Lucia } from 'lucia';
import { PostgresJsAdapter } from '@lucia-auth/adapter-postgresql';
import { cookies } from 'next/headers';
import { cache } from 'react';
import bcrypt from 'bcryptjs';
import { generateRandomString } from 'oslo/crypto';
import postgres from 'postgres';
import { db } from '../db';
import { users, sessions, type User as DatabaseUser, type Session as DatabaseSession } from '../db/schema';
import { eq } from 'drizzle-orm';

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
      secure: process.env.NODE_ENV === 'production',
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

// Export types for use throughout the application
export type User = DatabaseUser;
export type Session = DatabaseSession;

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Session management utilities
export async function createSession(userId: number): Promise<Session> {
  const sessionId = generateRandomString(40, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
  
  const [session] = await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  }).returning();
  
  return session;
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await lucia.invalidateSession(sessionId);
}

export async function invalidateUserSessions(userId: number): Promise<void> {
  await lucia.invalidateUserSessions(userId.toString());
}

// Cached session validation for performance
export const validateRequest = cache(async (): Promise<{ user: User; session: Session } | { user: null; session: null }> => {
  const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value ?? null;
  
  if (!sessionId) {
    return {
      user: null,
      session: null,
    };
  }

  const result = await lucia.validateSession(sessionId);
  
  // Next.js throws when you attempt to set cookie when rendering page
  try {
    if (result.session && result.session.fresh) {
      const sessionCookie = lucia.createSessionCookie(result.session.id);
      (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    }
    if (!result.session) {
      const sessionCookie = lucia.createBlankSessionCookie();
      (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    }
  } catch {
    // Ignore cookie setting errors in server components
  }
  
  // Convert Lucia result to our expected format
  if (result.user && result.session) {
    // Get full user data from database
    const fullUser = await getUserById(parseInt(result.user.id));
    if (!fullUser) {
      return { user: null, session: null };
    }
    
    return {
      user: fullUser,
      session: {
        id: result.session.id,
        userId: parseInt(result.user.id),
        expiresAt: result.session.expiresAt,
      },
    };
  }
  
  return {
    user: null,
    session: null,
  };
});

// User management utilities
export async function createUser(email: string, password: string, name: string): Promise<User> {
  const hashedPassword = await hashPassword(password);
  
  const [user] = await db.insert(users).values({
    email: email.toLowerCase(),
    hashedPassword,
    name,
  }).returning();
  
  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return user || null;
}

export async function getUserById(id: number): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user || null;
}

// Authentication flow helpers
export async function signIn(email: string, password: string): Promise<{ user: User; session: Session } | null> {
  const user = await getUserByEmail(email);
  
  if (!user) {
    return null;
  }
  
  const validPassword = await verifyPassword(password, user.hashedPassword);
  
  if (!validPassword) {
    return null;
  }
  
  const luciaSession = await lucia.createSession(user.id.toString(), {});
  
  const session: Session = {
    id: luciaSession.id,
    userId: user.id,
    expiresAt: luciaSession.expiresAt,
  };
  
  return {
    user,
    session,
  };
}

export async function signUp(email: string, password: string, name: string): Promise<{ user: User; session: Session }> {
  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  
  if (existingUser) {
    throw new Error('User already exists');
  }
  
  // Create new user
  const user = await createUser(email, password, name);
  
  // Create session
  const luciaSession = await lucia.createSession(user.id.toString(), {});
  
  const session: Session = {
    id: luciaSession.id,
    userId: user.id,
    expiresAt: luciaSession.expiresAt,
  };
  
  return {
    user,
    session,
  };
}

export async function signOut(sessionId: string): Promise<void> {
  await lucia.invalidateSession(sessionId);
}

// Re-export utilities from other auth modules
export * from './validation';
export * from './middleware';
export * from './session';