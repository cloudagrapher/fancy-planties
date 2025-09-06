// Re-export client-safe utilities
export * from './client';

// In-memory session activity storage (for demonstration)
// In production, this would be in a database
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

// Import SessionActivity type from client
import type { SessionActivity } from './client';