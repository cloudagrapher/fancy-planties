import { cookies } from 'next/headers';
import { lucia, validateRequest } from './index';
import { redirect } from 'next/navigation';

// Session cookie management
export async function setSessionCookie(sessionId: string): Promise<void> {
  const sessionCookie = lucia.createSessionCookie(sessionId);
  (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
}

export async function clearSessionCookie(): Promise<void> {
  const sessionCookie = lucia.createBlankSessionCookie();
  (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
}

// Session validation with redirect
export async function requireAuthSession() {
  const { user, session } = await validateRequest();
  
  if (!user || !session) {
    redirect('/auth/signin');
  }
  
  return { user, session };
}

// Optional authentication (doesn't redirect)
export async function getAuthSession() {
  return await validateRequest();
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

// Session security helpers
export function getSessionSecurityInfo(request: Request) {
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'Unknown';
  
  return {
    userAgent,
    ip,
    timestamp: new Date().toISOString(),
  };
}

// Session activity tracking (for future security features)
export interface SessionActivity {
  sessionId: string;
  userId: number;
  action: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

// In a production app, you'd store this in the database
const sessionActivities: SessionActivity[] = [];

export function logSessionActivity(activity: Omit<SessionActivity, 'timestamp'>) {
  sessionActivities.push({
    ...activity,
    timestamp: new Date(),
  });
  
  // Keep only last 100 activities per session (in memory)
  const sessionActivitiesForSession = sessionActivities.filter(
    a => a.sessionId === activity.sessionId
  );
  
  if (sessionActivitiesForSession.length > 100) {
    const toRemove = sessionActivitiesForSession.slice(0, -100);
    toRemove.forEach(activity => {
      const index = sessionActivities.indexOf(activity);
      if (index > -1) {
        sessionActivities.splice(index, 1);
      }
    });
  }
}

export function getSessionActivities(sessionId: string): SessionActivity[] {
  return sessionActivities.filter(a => a.sessionId === sessionId);
}