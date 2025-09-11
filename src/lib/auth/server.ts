import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { lucia } from './lucia';
import { cache } from 'react';
import { getUserById } from './index';
import type { User, Session } from '../db/schema';

// Session cookie management
export async function setSessionCookie(sessionId: string): Promise<void> {
  const sessionCookie = lucia.createSessionCookie(sessionId);
  (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
}

export async function clearSessionCookie(): Promise<void> {
  const sessionCookie = lucia.createBlankSessionCookie();
  (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
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

// Server-side session validation
export async function getAuthSession() {
  return await validateRequest();
}

// Require authenticated user or redirect
export async function requireAuthSession(redirectTo: string = '/auth/signin') {
  const { user, session } = await validateRequest();
  
  if (!user || !session) {
    redirect(redirectTo);
  }
  
  return { user, session };
}

// Require authenticated and email verified user or redirect
export async function requireVerifiedSession(redirectTo: string = '/auth/signin') {
  const { user, session } = await validateRequest();
  
  if (!user || !session) {
    redirect(redirectTo);
  }
  
  if (!user.isEmailVerified) {
    redirect('/auth/verify-email');
  }
  
  return { user, session };
}

// Check if user has verified email (without redirect)
export async function isEmailVerified(): Promise<boolean> {
  const { user } = await validateRequest();
  return !!(user && user.isEmailVerified);
}

// Check if user is authenticated (without redirect)
export async function isAuthenticated(): Promise<boolean> {
  const { user, session } = await validateRequest();
  return !!(user && session);
}

// Redirect authenticated users away from auth pages
export async function redirectIfAuthenticated(redirectTo: string = '/dashboard') {
  const { user, session } = await validateRequest();
  
  if (user && session) {
    redirect(redirectTo);
  }
}

// Session cleanup utility
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    // This would typically be run as a background job
    // For now, we'll rely on Lucia's built-in cleanup
    console.log('Session cleanup would run here');
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}