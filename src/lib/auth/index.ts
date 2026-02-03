import 'server-only';

import bcrypt from 'bcryptjs';
import { generateRandomString } from 'oslo/crypto';
import { db } from '../db';
import { users, sessions, type User as DatabaseUser, type Session as DatabaseSession } from '../db/schema';
import { eq } from 'drizzle-orm';
import { lucia } from './lucia';

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

export async function signUpUnverified(email: string, password: string, name: string): Promise<User> {
  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  
  if (existingUser) {
    // If user exists and is already verified, don't allow re-signup
    if (existingUser.isEmailVerified) {
      throw new Error('User already exists');
    }
    
    // If user exists but is not verified, update password and name to latest signup attempt.
    // This ensures the email owner (who receives the verification code) controls the password.
    const hashedPassword = await hashPassword(password);
    await db.update(users).set({ hashedPassword, name }).where(eq(users.id, existingUser.id));
    return { ...existingUser, hashedPassword, name };
  }
  
  // Create new unverified user (no session created)
  const user = await createUser(email, password, name);
  
  return user;
}

export async function signOut(sessionId: string): Promise<void> {
  await lucia.invalidateSession(sessionId);
}

export async function updateUserPassword(userId: number, newPassword: string): Promise<void> {
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  await db
    .update(users)
    .set({ hashedPassword })
    .where(eq(users.id, userId));
}

// Re-export utilities from other auth modules  
export * from './validation';
export * from './middleware';
export * from './session';